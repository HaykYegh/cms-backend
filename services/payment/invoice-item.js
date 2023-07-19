const paymentService = require('../payment');
const sql = require('../db');

const stripe = paymentService.stripe();
const stripeQueries = sql.queries.stripe;

async function authorize(props) {
  const now = Math.floor(Date.now() / 1000);
  const { priceToken, customerToken, period = { start: now, end: now }, quantity = 1 } = props;

  const authorized = await stripe.invoiceItems.create({
    price: priceToken,
    customer: customerToken,
    period: {
      start: period.start,
      end: period.end,
    },
    quantity,
  });

  return authorized;
}

async function createInvoice(client, { priceId, stripeCustomerId, token, quantity }) {
  const db = client || sql.getDB();
  const result = await db.query(stripeQueries.invoiceItems.create, [
    priceId, stripeCustomerId, token, quantity,
  ]);
  return result.rows[0];
}

module.exports = {
  authorize,
  create: createInvoice,
};
