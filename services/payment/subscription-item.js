const logger = require('../logger');
const sql = require('../db');
const paymentService = require('../payment');

const stripe = paymentService.stripe();
const stripeQueries = sql.queries.stripe;

async function getSubscriptionItems(db, { customerId }) {
  const client = db || await sql.getDB();

  try {
    const sqlResult = await client.query(stripeQueries.subscriptionsItems.get.byCustomerId, [
      customerId
    ]);
    logger.info(`subscriptionItems => ${JSON.stringify(sqlResult.rows)}`);
    return sqlResult.rows;
  } catch (e) {
    logger.info(e);
  }
}

async function createSubscriptionItem(client, { subscriptionId, subscriptionItem, priceId }) {
  const db = client || sql.getDB();

  try {
    const sqlResult = await db.query(stripeQueries.subscriptionsItems.create, [
      subscriptionId, subscriptionItem.id, priceId
    ]);
    return sqlResult.rows[0];
  } catch (e) {
    logger.info(e);
  }
}

async function deleteSubscriptionItem(client, { subscriptionItemId}) {
  const db = client || sql.getDB();

  try {
    await db.query(stripeQueries.subscriptionsItems.delete, [
      subscriptionItemId
    ]);
  } catch (e) {
    logger.info(e);
  }
}

function updateSubscriptionItem(subscriptionItemId, { quantity }) {
  return stripe.subscriptionItems.update(subscriptionItemId, { quantity });
}

module.exports = {
  create: createSubscriptionItem,
  delete: deleteSubscriptionItem,
  list: getSubscriptionItems,
  update: updateSubscriptionItem,
};
