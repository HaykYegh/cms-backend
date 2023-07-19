const sql = require('../db');

const stripeQueries = sql.queries.stripe;


async function getErrors(client, { customerId }) {
  const db = client || sql.getDB();

  const sqlResult = await db.query(stripeQueries.errors.get, [customerId]);

  return sqlResult.rows;
}


module.exports = {
  get: {
    errors: getErrors
  }
};
