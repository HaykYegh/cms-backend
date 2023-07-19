const sql = require('../../db');

const serviceQueries = require('../../../sql/services');


async function getUsers(db, params) {
  const {
    customerId,
    networkId,
    serviceId,
    registrationStartDate,
    registrationEndDate,
    countryId,
    platformId,
    q,
    limit,
    offset
  } = params;

  const sqlParams = [customerId, networkId, serviceId, registrationStartDate,
    registrationEndDate, countryId, platformId, q, limit, offset];

  const client = db || sql.getDB();
  const query = await client.query(serviceQueries.list.users, sqlParams);
  return query.rows;
}

async function getUsersCount(db, params) {
  const {
    customerId,
    networkId,
    serviceId,
    registrationStartDate,
    registrationEndDate,
    countryId,
    platformId,
    q
  } = params;

  const sqlParams = [customerId, networkId, serviceId, registrationStartDate,
    registrationEndDate, countryId, platformId, q];

  const client = db || sql.getDB();
  const query = await client.query(serviceQueries.count.users, sqlParams);

  return query.rows[0] ? +query.rows[0].count : 0;
}

async function removeUser(db, { customerId, networkId, serviceId, userId }) {
  const client = db || sql.getDB();
  const query = await client
    .query(serviceQueries.delete.user, [customerId, networkId, serviceId, userId]);
  return query.rows[0] ? query.rows[0] : null;
}


module.exports = {
  list: {
    users: getUsers,
  },
  count: {
    users: getUsersCount
  },
  remove: {
    user: removeUser
  }
};
