const sql = require('../../db');

const serviceQueries = require('../../../sql/services');


async function getNetworkServices(db, params) {
  const { customerId, networkId, limit, offset } = params;
  const client = db || sql.getDB();
  const query = await client.query(serviceQueries.list.services,
    [customerId, networkId, limit, offset]);
  return query.rows;
}

async function getNetworkServicesCount(db, params) {
  const { customerId, networkId } = params;
  const client = db || sql.getDB();
  const query = await client.query(serviceQueries.count.services, [customerId, networkId]);
  return query.rows[0] ? +query.rows[0].count : 0;
}


async function getNetworkServiceByNicknameOrToken(db, params) {
  const { customerId, token } = params;
  const client = db || sql.getDB();
  const query = await client.query(serviceQueries.retrieve.serviceByNicknameOrToken, [customerId, token]);
  return query.rows[0];
}


module.exports = {
  list: {
    services: getNetworkServices
  },
  count: {
    services: getNetworkServicesCount
  },
  retrieve: {
    serviceByNicknameOrToken: getNetworkServiceByNicknameOrToken
  }
};
