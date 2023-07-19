const fs = require('fs');
const sql = require('./db');
const customerService = require('./customers');
const logger = require('./logger');

const presenceQueries = sql.queries.presence;

function set(body, callback) {
  const presence = JSON.parse(body);
  const sqlQuery = {
    params: [
      presence.prefix,
      presence.username,
      presence.deviceId,
      presence.createdAt,
      presence.available,
    ],
    raw: fs.readFileSync('sql/presence/insert-presence.sql').toString()
  };
  sql.query(sqlQuery.raw, sqlQuery.params)
    .then((res) => {
      const result = res.rows[0];
      if (res.rowCount > 0) {
        callback(null, result);
      } else {
        callback('SQL_QUERY_ERROR', null);
      }
    })
    .catch((e) => {
      console.log('### sqlQuery ###');
      console.log(sqlQuery);
      console.log(e);
      callback('DB_ERROR', null);
    });
}


async function createUserPresenceInstant(body) {
  const presence = JSON.parse(body);


  // _customer_id INTEGER, _username TEXT,
  //     _user_device_token TEXT, _created_at TEXT,
  //     _is_available BOOLEAN, _network_id INTEGER


  // {
  //   "username": "zz79189112747",
  //     "createdAt": 1549380545467,
  //     "deviceId": "0066120E-4EC0-4FD8-9A5B-0712F9618DA6",
  //     "available": false,
  //     "number": "79189112747",
  //     "prefix": "zz",
  //     "meta": null
  // }


  const customer = customerService.getCustomers().getValue(presence.prefix);

  logger.info(customer);

  const networkId = presence.meta ? presence.meta.network || null : null;

  logger.info(`networkId = ${networkId}`);

  const sqlParams = [customer.customerId, presence.username, presence.deviceId,
    presence.createdAt, presence.available, networkId];

  logger.info(`sqlParams = ${sqlParams.toLocaleString()}`);

  const query = await sql.getDB().query(presenceQueries.create, sqlParams);

  logger.info(query.rows);

  return query.rows[0];
}


module.exports = {
  set,
  instant: {
    create: createUserPresenceInstant
  }
};
