const paymentService = require('../payment');
const subscriptionService = require('./subscription');
const logger = require('../logger');
const sql = require('../db');

const stripe = paymentService.stripe();

const METERED_PLAN = subscriptionService.SUBSCRIPTION_CONSTANTS.METERED;
const LICENSED_PLAN = subscriptionService.SUBSCRIPTION_CONSTANTS.LICENSED;


const usageReportQueries = sql.queries.payments.usageReport;


async function addUsageRecord(props) {
  const {
    subscriptionItemToken, quantity, timestamp = Math.floor(Date.now() / 1000), action = 'set',
  } = props;
  const authorizeUsageRecord = stripe.subscriptionItems.createUsageRecord(subscriptionItemToken, {
    quantity, timestamp, action,
  });
  logger.info(`authorizeUsageRecord => ${JSON.stringify(authorizeUsageRecord)}`);
  return authorizeUsageRecord;
}


function computeActivities({ networkId, activities, periodStart, periodEnd }) {
  const userUsages = [];

  for (const user of activities) {
    let calculatedSeconds = 0;
    let unusedSeconds = 0;
    const userActivities = user.activities;

    let startTime = periodStart;
    let hasStart = true;
    let endTime = 0;

    const lastIndex = userActivities.length - 1;

    for (const activity of userActivities) {
      if (activity.type === 1) {
        startTime = activity.timestamp;
        hasStart = true;
      } else if (hasStart) {
        endTime = activity.timestamp;
        calculatedSeconds += endTime - startTime;
        hasStart = false;
      }
    }

    if (userActivities[lastIndex].type === 1) {
      startTime = userActivities[lastIndex].timestamp;
      endTime = periodEnd;
      calculatedSeconds += endTime - startTime;
    } else if (userActivities[0].type !== 1) {
      unusedSeconds += periodEnd - userActivities[lastIndex].timestamp;
    }


    const daySeconds = 86400;
    const calculatedDays = Math.round(calculatedSeconds / daySeconds);

    const overallSeconds = calculatedSeconds - unusedSeconds;
    const overallDays = Math.round((calculatedSeconds - unusedSeconds) / daySeconds);

    const unusedDays = Math.floor(unusedSeconds / daySeconds);


    userUsages.push({
      calculated: {
        seconds: calculatedSeconds,
        days: calculatedDays,
      },
      unused: {
        seconds: unusedSeconds,
        days: unusedDays,
      },
      overall: {
        seconds: overallSeconds,
        days: overallDays,
      },
      period: {
        start: periodStart,
        end: periodEnd,
      },
      userActivities,
    });
  }
  const overallUsage = userUsages.reduce((accumulator, currentUser) => {
    const currentValue = currentUser.overall.days;
    return accumulator + currentValue;
  }, 0);

  return {
    networkId,
    userUsages,
    overallUsage,
  };
}

async function xg(params) {
  const client = await sql.getDB().connect();
  try {
    await client.query('BEGIN');

    // const { type, activity: { networkId, createdAt } } = params;

    const subscriptionQuery = await client.query(
      usageReportQueries.getNetworkSubscriptions, [networkId]);

    const networkSubscription = subscriptionQuery.rows[0];

    if (!networkSubscription) {
      return logger.info(`NETWORK_NOT_SUBSCRIBED=${networkId}`);
    }


    const stripeSubscriptionId = networkSubscription.subscription.objectId;

    const stripeSubscription = await subscriptionService.retrieve(stripeSubscriptionId);

    const periodStart = stripeSubscription.current_period_start;
    const periodEnd = stripeSubscription.current_period_end;


    const usageDetails = {
      periodStart,
      periodEnd,
      type,
      networkId
    };


    const networkActivitiesQuery = await client.query(
      usageReportQueries.getNetworkActivities, [networkId, periodStart, periodEnd]);

    const networkActivities = networkActivitiesQuery.rows;

    const { userUsages, overallUsage } = computeActivities({
      networkId,
      activities: networkActivities,
      periodStart,
      periodEnd
    });


    const reportUsageQuery = await client.query(usageReportQueries.reportUsage, [
      usageDetails.periodStart,
      usageDetails.periodEnd,
      usageDetails.type,
      usageDetails.networkId,
      overallUsage,
      JSON.stringify(userUsages)
    ]);

    const reportUsage = reportUsageQuery.rows[0].usage;

    const subscriptionItems = networkSubscription.subscription.items;

    const subscriptionObjectIds = {};

    for (const subscriptionItem of subscriptionItems) {
      subscriptionObjectIds[subscriptionItem.planType] = subscriptionItem;
    }

    if (subscriptionObjectIds[LICENSED_PLAN]) {
      const objectId = subscriptionObjectIds[LICENSED_PLAN].objectId;
      // update user count to licensed
      await subscriptionService
        .subscriptionItems
        .update(objectId, { quantity: reportUsage.quantity });
    }
    if (subscriptionObjectIds[METERED_PLAN]) {
      const objectId = subscriptionObjectIds[METERED_PLAN].objectId;
      // update usage to metered
      await addUsageRecord(objectId, { quantity: reportUsage.overallUsage, createdAt });
    }


    logger.info(`>_: USAGE REPORTED = {networkId: ${networkId}, overall: ${reportUsage.overallUsage}, quantity: ${reportUsage.quantity}`);

    await client.query('COMMIT');
  } catch (e) {
    logger.error(e);
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

const getUsageRecords = (subscriptionItemToken) => {
  const usageRecord = stripe.subscriptionItems.listUsageRecordSummaries(
    subscriptionItemToken,
  );
  logger.info(`usageRecord => ${JSON.stringify(usageRecord)}`);
  return usageRecord;
};

module.exports = {
  add: addUsageRecord,
  get: getUsageRecords,
};
