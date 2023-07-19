const logger = require('../logger');
const paymentService = require('../payment');
const sql = require('../db');
const paymentCustomersService = require('./customer');

const stripeQueries = sql.queries.stripe;
const stripe = paymentService.stripe();


function authorizeCard({ customerToken, source }) {
  return stripe.customers.createSource(customerToken, { source });
}

function unAuthorizeCard({ stripeCustomerToken, source }) {
  if (stripeCustomerToken && source) {
    return stripe.customers.deleteSource(stripeCustomerToken, source);
  }
}

async function getCard({ customerId, adminId, networkId, cardId }) {
  const { stripeId } = await paymentCustomersService
    .get(null, { customerId, adminId, networkId });
  return stripe.customers.retrieveCard(stripeId, cardId);
}

async function deleteCard(client, { cardId }) {
  const db = client || sql.getDB();

  try {
    await db.query(stripeQueries.cards.delete.byCardId, [cardId]);
  } catch (e) {
    logger.error(e);
  }
}

function setDefaultCard(client, { customerId, cardId }) {
  return new Promise((resolve, reject) => {
    const db = client || sql.getDB();

    db.query(stripeQueries.cards.update.setDefault, [customerId, cardId], (err, sqlResult) => {
      if (err) {
        return reject(err);
      }
      const result = sqlResult.rows[0];
      logger.info(`defaultCard => ${JSON.stringify(result)}`);
      resolve(result);
    });
  });
}

async function createCard(client, { stripeCustomer, source, meta, isDefault }) {
  const db = client || sql.getDB();

  try {
    const sqlResult = await db.query(stripeQueries.cards.create, [
      stripeCustomer.stripeCustomerId, source, meta, false
    ]);
    const card = sqlResult.rows[0];
    if (isDefault) {
      await setDefaultCard(db, { customerId: stripeCustomer.customerId, cardId: card.cardId });
    }
    return card;
  } catch (e) {
    logger.error(e);
  }
}

async function getCards(db, { customerId, limit, offset }) {
  const client = db || sql.getDB();

  try {
    const cardQueryResult = await client.query(stripeQueries.cards.list.byCustomerId, [
      customerId, limit, offset,
    ]);
    const cards = cardQueryResult.rows;
    // logger.info(`cards => ${JSON.stringify(cards)}`);
    return cards;
  } catch (e) {
    logger.error(e);
  }
}

module.exports = {
  create: createCard,
  list: getCards,
  get: getCard,
  delete: deleteCard,
  authorize: authorizeCard,
  unAuthorize: unAuthorizeCard,
};
