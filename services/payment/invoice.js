const paymentService = require('../payment');
const paymentCustomersService = require('./customer');
const sql = require('../db');
const sqlQueries = require('../../sql/sql-queries');

const stripeQueries = sql.queries.stripe;
const stripe = paymentService.stripe();

async function authorize({ customerToken, autoAdvance = true }) {
  return stripe.invoices.create({
    customer: customerToken,
    auto_advance: autoAdvance
  });
}

async function pay(invoiceId) {
  const paid = await stripe.invoices.pay(invoiceId);
  return paid;
}

async function getStripeInvoices(params) {
  const { customerId, adminId, networkId, limit, startingAfter, endingBefore } = params;
  const { stripeId } = await paymentCustomersService.getByCustomerId(null, {
    customerId, adminId, networkId
  });
  const qs = {
    limit,
    customer: stripeId
  };
  if (startingAfter !== '') {
    qs.starting_after = startingAfter;
  }
  if (endingBefore !== '') {
    qs.ending_before = endingBefore;
  }
  return stripe.invoices.list(qs);
}

async function getInvoices(client, { stripeCustomerId, year }) {
  const db = client || sql.getDB();
  const sqlResult = await db.query(stripeQueries.invoices.get, [stripeCustomerId, year]);

  return sqlResult.rows;
}

async function getUpcomingInvoice(params) {
  const { customerId, adminId, networkId } = params;
  const { stripeId } = await paymentCustomersService.get(null, { customerId, adminId, networkId });

  const invoice = await stripe.invoices.retrieveUpcoming(stripeId);

  return invoice;
}

async function getInvoice(params) {
  const { customerId, adminId, networkId, invoiceId } = params;
  await paymentCustomersService.get(null, { customerId, adminId, networkId });

  const invoice = await stripe.invoices.retrieve(invoiceId);
  return invoice;
}

async function createInvoice(client, { customerStripeId, token, paid = false, totalAmount, currency = 'usd' }) {
  const db = client || sql.getDB();

  const result = await db.query(stripeQueries.invoices.create, [
    customerStripeId, token, paid, totalAmount, currency
  ]);
  return result.rows[0];
}

async function updateInvoice(client, { invoiceId, paid, errorCode }) {
  const db = client || sql.getDB();

  const result = await db.query(stripeQueries.invoices.update, [invoiceId, paid, errorCode]);

  return result.rows[0];
}

module.exports = {
  authorize,
  pay,
  create: createInvoice,
  update: {
    invoice: updateInvoice,
  },
  stripeList: getStripeInvoices,
  list: getInvoices,
  upcoming: getUpcomingInvoice,
  retrieve: getInvoice
};
