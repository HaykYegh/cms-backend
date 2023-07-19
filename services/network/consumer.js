const sql = require('../db');


const networkQueries = sql.queries.networks;


const EVENT_TYPES_CONSTANTS = {
  NETWORK_INVITE: 1,
  NETWORK_INVITE_REPLY: 2,
};

async function createConsumerEvent(db, params) {
  const client = db || sql.getDB();

  const { consumerId, eventTypeId, request = null, response = null } = params;

  const requestData = JSON.stringify(request);
  const responseData = JSON.stringify(response);

  const sqlQuery = networkQueries.create.consumerEvent;
  const query = await client.query(sqlQuery, [consumerId, eventTypeId, requestData, responseData]);


  if (!query.rows[0]) {
    throw new Error('CONSUMER_EVENT_ERROR');
  }

  return query.rows[0];
}

async function retrieveConsumer(db, { consumerId }) {
  const client = db || sql.getDB();

  const sqlQuery = networkQueries.retrieve.consumer;
  const query = await client.query(sqlQuery, [consumerId]);

  if (!query.rows[0]) {
    throw new Error('INVALID_CONSUMER');
  }

  return query.rows[0];
}


module.exports = {
  create: {
    consumerEvent: createConsumerEvent
  },
  retrieve: {
    consumer: retrieveConsumer
  },
  constants: EVENT_TYPES_CONSTANTS
};
