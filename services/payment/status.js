const sql = require('../db');

const stripeQueries = sql.queries.stripe;


async function createPaymentStatus(client, { paid, errorCode, customerId }) {
  const db = client || sql.getDB();

  const result = await db.query(stripeQueries.paymentStatus.create, [
    paid,
    errorCode,
    customerId
  ]);

  return result.rows[0];
}

async function updatePaymentStatus(client, { paid, errorCode, customerId }) {
  const db = client || sql.getDB();

  const result = await db.query(stripeQueries.paymentStatus.update, [
    paid,
    errorCode,
    customerId
  ]);

  return result.rows[0];
}

async function createOrUpdatePaymentStatus(client, { customerId, paid, errorCode }) {
  const db = client || sql.getDB();

  const sqlResult = await db.query(stripeQueries.paymentStatus.get, [
    customerId
  ]);

  let paymentStatus;
  if (!sqlResult.rows[0]) {
    paymentStatus = await createPaymentStatus(null, {
      paid,
      errorCode,
      customerId
    });
  } else {
    paymentStatus = await updatePaymentStatus(null, {
      paid,
      errorCode,
      customerId
    });
  }

  return paymentStatus;
}


module.exports = {
  update: updatePaymentStatus,
  create: createPaymentStatus,
  createOrUpdate: createOrUpdatePaymentStatus
};
