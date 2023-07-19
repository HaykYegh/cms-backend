const request = require('request');


const sql = require('../db');
const networkService = require('../network');
const userService = require('../user');
const networkConsumerService = require('../network/consumer');
const stompService = require('../stomp');
const constants = require('../../helpers/constants');
const logger = require('../logger');


const networkQueries = sql.queries.networks;


function createNotifyRequest({ uri, username }) {
  return new Promise((resolve, reject) => {
    request.post(uri,
      { qs: { username } },
      (err, httpResponse, result) => {
        if (err) {
          logger.error(err);
          return reject(err);
        }

        logger.error(result);

        resolve(result);
      });
  });
}

async function getNetworkInvites(db, { customerId, networkId, limit, offset }) {
  const client = db || sql.getDB();
  const query = await client
    .query(networkQueries.modules.invites.get.all.records, [customerId, networkId, limit, offset]);
  return query.rows;
}

async function getNetworkInviteCount(db, { customerId, networkId }) {
  const client = db || sql.getDB();
  const query = await client
    .query(networkQueries.modules.invites.get.all.count, [customerId, networkId]);

  if (query.rows[0] && query.rows[0].count) {
    return +query.rows[0].count;
  }
  return 0;
}

async function createNetworkInviteNotifier(db, { consumerId, invitedNumbers }) {
  const client = db || sql.getDB();
  const query = await client
    .query(networkQueries.create.notifier, [consumerId, JSON.stringify(invitedNumbers)]);
  return query.rowCount > 0;
}


async function removeNetworkInviteNotifier(db, { notifierId, consumerId, userId }) {
  const client = db || sql.getDB();
  const query = await client
    .query(networkQueries.delete.notifier, [notifierId, consumerId, userId]);
  return query.rowCount > 0;
}


async function handleNetworkInviteNotifier(notifier) {
  const { consumerId, notifierId, userId } = notifier;

  const customerId = constants.CUSTOMERS.ZANGI;
  const client = await sql.getDB().connect();
  try {
    await client.query('BEGIN');
    const consumer = await networkConsumerService.retrieve.consumer(client, { consumerId });
    if (!consumer) {
      throw new Error('INVALID_CONSUMER');
    }

    const user = await userService.retrieve.userById(client, { customerId, userId });

    if (!user) {
      throw new Error('INVALID_USER');
    }

    if (!consumer.uri || consumer.uri === '') {
      throw new Error('INVALID_CONSUMER_URI');
    }
    const username = user.username.replace(/\D/g, '');
    await createNotifyRequest({ uri: consumer.uri, username });
    await removeNetworkInviteNotifier(client, { notifierId, consumerId, userId });
    await client.query('COMMIT');
  } catch (e) {
    logger.error(e);
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}


async function createNetworkInvite(db, {
  customerId,
  adminId,
  networkId,
  prefix,
  numbers,
  consumerId = null
}) {
  const client = db || sql.getDB();

  const network = await networkService
    .get
    .one
    .network(client, { customerId, networkId });
  if (!network) {
    throw new Error('INVALID_NETWORK');
  }
  const invitedNumbers = numbers.map(number => prefix + number.replace(/\+/i, ''));
  const inviteQuery = await client.query(networkQueries.modules.invites.create,
    [networkId, adminId, JSON.stringify(invitedNumbers)]);

  if (consumerId) {
    try {
      await createNetworkInviteNotifier(null, { consumerId, invitedNumbers });
    } catch (e) {
      logger.info(e);
    }
  }

  return {
    network,
    invites: inviteQuery.rows
  };
}

async function deleteNetworkInvite(db, { customerId, networkId, inviteId }) {
  const client = db || sql.getDB();
  const query = await client
    .query(networkQueries.modules.invites.delete, [customerId, networkId, inviteId]);
  return query.rowCount > 0;
}


module.exports = {
  get: {
    all: {
      records: getNetworkInvites,
      count: getNetworkInviteCount,
    }
  },
  create: createNetworkInvite,
  delete: deleteNetworkInvite,

  handle: {
    notifier: handleNetworkInviteNotifier
  },
  remove: {
    notifier: removeNetworkInviteNotifier
  }
};
