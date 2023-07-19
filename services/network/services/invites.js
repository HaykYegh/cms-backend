const sql = require('../../db');
const customerService = require('../../customers');


const serviceQueries = require('../../../sql/services');


async function getServiceInvites(db, { networkId, serviceId, limit, offset }) {
  const client = db || sql.getDB();
  const query = await client
    .query(serviceQueries.list.invites, [networkId, serviceId, limit, offset]);
  return query.rows;
}

async function getServiceInviteCount(db, { networkId, serviceId }) {
  const client = db || sql.getDB();
  const query = await client
    .query(serviceQueries.count.invites, [networkId, serviceId]);
  return query.rows[0] ? +query.rows[0].count : 0;
}


async function createServiceInvites(db, params) {
  const client = db || sql.getDB();

  const { customerId, networkId, serviceId, adminId } = params;
  const { prefix } = customerService.get.customerId(customerId);

  const numbers = params.numbers.map(number => prefix + number.replace(/\+/i, ''));
  const query = {
    sql: serviceQueries.create.invites,
    params: [customerId, networkId, serviceId, adminId, JSON.stringify(numbers)],
  };
  const result = await client.query(query.sql, query.params);
  return {
    invites: result.rows
  };
}


module.exports = {
  list: {
    invites: getServiceInvites,
  },
  create: {
    invites: createServiceInvites
  },
  count: {
    invites: getServiceInviteCount
  }

};
