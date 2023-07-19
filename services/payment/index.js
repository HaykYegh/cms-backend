const sql = require('../db');
const logger = require('../logger');
const config = require('config');
const stripe = require('stripe');

const userQueries = sql.queries.users;

let stripeInstance = null;


const { payments } = sql.queries;
const stripeQueries = sql.queries.stripe;

const stringify = JSON.stringify;

const getPaymentCustomer = (client, { customerId }) =>
  new Promise((resolve, reject) => {
    client.query(payments.getCustomer, [customerId], (err, sqlResult) => {
      if (err) {
        return reject(err);
      }
      const result = sqlResult.rows[0];
      if (result) {
        resolve(result);
      } else {
        reject('CUSTOMER_NOT_EXIST');
      }
    });
  });

const setPaymentCustomer = (client, { customer, stripeCustomer }) =>
  new Promise((resolve, reject) => {
    const customerId = customer.id;
    const customerToken = stripeCustomer.id;
    client.query(payments.setCustomer, [customerId, customerToken], (err, sqlResult) => {
      if (err) {
        return reject(err);
      }
      const result = sqlResult.rows[0];
      resolve(result);
    });
  });

const authorizePaymentCustomer = (customer, token) => stripeInstance.customers.create({
  email: customer.email,
  source: token.id,
  description: `Created customer for esh at ${new Date()}.`,
});

const setPaymentCustomerDefaultSource = ({ customerToken, source }) =>
  stripeInstance.customers.update(customerToken, {
    default_source: source,
  });


const setPaymentCard = (client, { paymentCustomer, token, isDefault }) =>
  new Promise((resolve, reject) => {
    const stripeCustomerId = paymentCustomer.stripeCustomerId;
    const cardId = token.card.id;
    const meta = JSON.stringify(token);
    client.query(payments.setCard, [
      stripeCustomerId, cardId, meta, isDefault
    ], (err, sqlResult) => {
      if (err) {
        return reject(err);
      }
      const result = sqlResult.rows[0];
      resolve(result);
    });
  });


const createSource = ({ paymentCustomer, token }) =>
  stripeInstance.customers.createSource(
    paymentCustomer.token,
    { source: token.id }
  );

const unAuthorizePaymentCard = ({ customerToken, cardToken }) =>
  stripeInstance.customers.deleteSource(
    customerToken,
    cardToken
  );

const getPaymentCards = (client, { customerId, limit, offset }) =>
  new Promise((resolve, reject) => {
    const db = client || sql.getDB();
    db.query(payments.getCards, [customerId, limit, offset], (err, sqlResult) => {
      if (err) {
        return reject(err);
      }
      const result = sqlResult.rows;
      resolve(result);
    });
  });


const getPaymentCard = (client, { customerId, cardId }) =>
  new Promise((resolve, reject) => {
    const db = client || sql.getDB();
    db.query(stripeQueries.cards.get.byCardIdAndCustomerId, [customerId, cardId],
      (err, sqlResult) => {
        if (err) {
          return reject(err);
        }
        const result = sqlResult.rows[0];
        if (result) {
          resolve(result);
        } else {
          reject('CARD_NOT_EXIST');
        }
      });
  });


const deletePaymentCard = (client, { customerId, cardId }) =>
  new Promise((resolve, reject) => {
    const db = client || sql.getDB();

    (async () => {
      const getCard = await getPaymentCard(db, { customerId, cardId });
      logger.info(`getCard:${stringify(getCard)}`);

      const confirm = await unAuthorizePaymentCard({
        customerToken: getCard.customerToken,
        cardToken: getCard.card.id
      });
      logger.info(`confirm:${stringify(confirm)}`);

      if (!confirm.deleted) {
        return reject('UNAUTHORISED_CARD');
      }

      // payments.deleteCard
      db.query(stripeQueries.cards.delete.byCustomerId, [customerId, getCard.cardId],
        (err, sqlResult) => {
          if (err) {
            return reject(err);
          }
          const result = !!sqlResult.rowCount;
          if (result) {
            resolve(result);
          } else {
            reject('CARD_NOT_EXIST');
          }
        });
    })().catch((e) => {
      reject(e);
    });
  });


const setPaymentCardDefault = (client, { customerId, cardId }) =>
  new Promise((resolve, reject) => {
    const db = client || sql.getDB();

    (async () => {
      const getCard = await getPaymentCard(db, { customerId, cardId });
      logger.info(`getCard:${stringify(getCard)}`);

      const customer = await setPaymentCustomerDefaultSource({
        customerToken: getCard.customerToken,
        source: getCard.card.id
      });
      logger.info(`customer:${stringify(customer)}`);

      db.query(stripeQueries.cards.update.setDefault, [customerId, getCard.cardId],
        (err, sqlResult) => {
          const result = sqlResult.rows[0];
          if (err) {
            return reject(err);
          }
          if (result) {
            resolve(result);
          } else {
            reject('CARD_NOT_EXIST');
          }
        });
    })().catch((e) => {
      reject(e);
    });
  });

const attachCard = async (customer, token) => {
  const client = await sql.getDB().connect();
  logger.info('> Client connected');

  try {
    await client.query('BEGIN');
    logger.info('> Transaction began');

    let paymentCustomer;
    try {
      paymentCustomer = await getPaymentCustomer(client, customer);
    } catch (e) {
      logger.error(e);
    }

    let paymentCard = null;
    let paymentCardParams = null;
    if (!paymentCustomer) {
      const stripeCustomer = await authorizePaymentCustomer(customer, token);
      logger.info(`> authorizePaymentCustomer: ${stringify(stripeCustomer)}`);

      const paymentCustomer = await setPaymentCustomer(client, { customer, stripeCustomer });
      logger.info(`> setPaymentCustomer: ${stringify(paymentCustomer)}`);

      paymentCardParams = { paymentCustomer, token, isDefault: true };
    } else {
      const authorizeCardParams = { paymentCustomer, token, isDefault: false };
      logger.info(`> authorizeCardParams: ${stringify(authorizeCardParams)}`);

      const authorizedPaymentCard = await createSource(authorizeCardParams);
      logger.info(`> authorizedPaymentCard: ${stringify(authorizedPaymentCard)}`);

      paymentCardParams = { paymentCustomer, token, isDefault: false };
    }
    logger.info(`> paymentCardParams: ${stringify(paymentCardParams)}`);
    paymentCard = await setPaymentCard(client, paymentCardParams);
    logger.info(`> paymentCard: ${stringify(paymentCard)}`);

    await client.query('COMMIT');
    return paymentCard;
  } catch (e) {
    logger.error(e);
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
};

function getStripeInstance() {
  if (!stripeInstance) {
    let stripeConf;
    try {
      stripeConf = config.get('stripe');
    } catch (e) {
      logger.error('Can not find stripe root config');
    }
    if (typeof stripeConf === 'undefined') {
      logger.error('Stripe is not configured');
      return undefined;
    }
    if (stripeConf.secret === '') {
      logger.error('Stripe secret code is absent ');
      return undefined;
    }
    stripeInstance = stripe(stripeConf.secret);
  }
  return stripeInstance;
}

const getActivitiesSQL = `
SELECT user_id as "userId",  json_agg(
           json_build_object('userId', user_id, 'createAt', created_at, 'type', network_activity_type_id, 'seconds',
                             extract(EPOCH FROM created_at AT TIME ZONE 'utc'))) as "activity" 
                             FROM virtual_network.network_activities
WHERE network_id = $1 AND created_at IS NOT NULL AND created_at::DATE BETWEEN '2019-02-01'::DATE AND '2019-02-28'::DATE
GROUP BY user_id;`;


const globStartDate = 1548979200;
const globEndDate = 1551398399;


async function calc(db, { networkId }) {
  const client = db || sql.getDB();

  const activitiesQuery = await client.query(getActivitiesSQL, [networkId]);

  const activitiesByUser = activitiesQuery.rows;
  const seconds = {};

  for (const user of activitiesByUser) {
    let localTime = 0;
    let unusedTime = 0;
    const activities = user.activity.sort((a, b) => a.seconds - b.seconds);

    let startDate = globStartDate;
    let hasStart = true;
    let endDate = 0;

    const lastIndex = activities.length - 1;

    for (const activity of activities) {
      if (activity.type === 1) {
        startDate = activity.seconds;
        hasStart = true;
      } else if (hasStart) {
        endDate = activity.seconds;
        localTime += endDate - startDate;
        hasStart = false;
      }
    }

    if (activities[lastIndex].type === 1) {
      startDate = activities[lastIndex].seconds;
      endDate = globEndDate;
      localTime += endDate - startDate;
    } else {
      unusedTime += globEndDate - activities[lastIndex].seconds;
    }

    seconds[user.userId] = {
      activities,
      localTime,
      unusedTime
    };
  }
  return seconds;
}

async function getUsersWidthEmails(db, { users }) {
  const client = db || sql.getDB();
  const usersQueryResult = await client
    .query(userQueries.get.recordsWidthEmail,
      [users]);
  return usersQueryResult.rows;
}

async function getUsersWidthNicknames(db, { users }) {
  const client = db || sql.getDB();
  const usersQueryResult = await client
    .query(userQueries.get.recordsWidthNickname,
      [users]);
  return usersQueryResult.rows;
}

async function getUsersWidthUsernames(db, { email, customerId }) {
  const client = db || sql.getDB();
  const usersQueryResult = await client
    .query(userQueries.get.recordsWidthUsernames,
      [email, customerId]);
  return usersQueryResult.rows;
}

async function createTestToken() {
  return getStripeInstance().tokens.create({
    card: {
      number: '4242424242424242',
      exp_month: 6,
      exp_year: 2022,
      cvc: '314',
    },
  });
}

module.exports = {
  stripe: getStripeInstance,
  usersWidthEmails: getUsersWidthEmails,
  usersWidthUsernames: getUsersWidthUsernames,
  usersWidthNicknames: getUsersWidthNicknames,
  attachCard,
  getPaymentCards,
  deletePaymentCard,
  setPaymentCardDefault,
  calc,
  getPaymentCustomer,
  createTestToken,
};
