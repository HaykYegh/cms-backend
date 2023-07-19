const sql = require('../db');
const logger = require('../logger');

const stripeQueries = sql.queries.stripe;

async function getTierGroup(client, { tierGroupId }) {
  const db = client || sql.getDB();

  try {
    const sqlResult = await db.query(stripeQueries.tierGroups.get, [tierGroupId]);
    logger.info(`tierGroup => ${JSON.stringify(sqlResult.rows[0])}`);
    return sqlResult.rows[0];
  } catch (e) {
    logger.info(e);
  }
}

async function getTiersByGroupId(client, { tierGroupId }) {
  const db = client || sql.getDB();

  try {
    const sqlResult = await db.query(stripeQueries.tiers.getByGroupId, [tierGroupId]);
    logger.info(`tiers => ${JSON.stringify(sqlResult.rows)}`);
    return sqlResult.rows;
  } catch (e) {
    logger.info(e);
  }
}

async function createTierGroupCustomer(client, { stripeCustomerId, tierGroupId }) {
  const db = client || sql.getDB();

  try {
    const sqlResult = await db.query(stripeQueries.tierGroupCustomers.create, [
      stripeCustomerId, tierGroupId
    ]);
    return sqlResult.rows[0];
  } catch (e) {
    logger.info(e);
  }
}

async function deleteTierGroupCustomer(client, { tierGroupCustomerId }) {
  const db = client || sql.getDB();

  try {
    await db.query(stripeQueries.tierGroupCustomers.delete, [tierGroupCustomerId]);
  } catch (e) {
    logger.error(e);
  }
}

module.exports = {
  getGroup: getTierGroup,
  getTiersByGroupId,
  createTierGroupCustomer,
  deleteTierGroupCustomer,
};
