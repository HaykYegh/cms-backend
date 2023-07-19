const paymentService = require('../payment');
const logger = require('../logger');
const sql = require('../db');

const stripe = paymentService.stripe();
const stripeQueries = sql.queries.stripe;

function authorizePrice(props) {
  const { amount, currency, recurring, productToken, billingScheme, tiersMode, tiers } = props;
  const price = {
    currency,
    recurring,
    product: productToken,
    billing_scheme: billingScheme,
    tiers_mode: tiersMode,
    tiers,
  };

  if (props.amount) {
    price.unit_amount = amount;
  }

  return stripe.prices.create(price);
}

async function createPrice(client, { tierGroupCustomerId, token, amount, productId }) {
  const db = client || sql.getDB();

  try {
    const sqlResult = await db.query(stripeQueries.prices.create, [
      productId, tierGroupCustomerId, token, amount
    ]);
    return sqlResult.rows[0];
  } catch (e) {
    logger.error(e);
  }
}

async function getPrice(client, { priceId }) {
  const db = client || sql.getDB();

  try {
    const sqlResult = await db.query(stripeQueries.prices.get, [priceId]);
    return sqlResult.rows[0];
  } catch (e) {
    logger.error(e);
  }
}

async function deletePrice(client, { priceId }) {
  const db = client || sql.getDB();

  try {
    await db.query(stripeQueries.prices.delete, [priceId]);
  } catch (e) {
    logger.error(e);
  }
}

module.exports = {
  get: getPrice,
  create: createPrice,
  delete: deletePrice,
  authorize: authorizePrice,
};
