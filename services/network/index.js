const sql = require('../db');
const { SERVER_MESSAGES } = require('../../helpers/constants');
const logger = require('../logger');
const utils = require('../../helpers/utils');
const helpers = require('../../helpers');
const customerService = require('../../services/customers');
const { toServer } = require('../system-message');
const emailService = require('../email');


const config = require('config');
const request = require('request');

const networkQueries = sql.queries.networks;
const emailConstants = emailService.CONSTANTS;

const NETWORK_CONSTANTS = {
  STATUSES: {
    ACTIVE: 1,
    DELETED: 2,
    SUSPENDED: 3,
    BLOCKED: 4,
    TRIAL: 5,
    TESTING: 6,
  },
  EVENT_TYPES: {
    TRIAL: {
      START: 'TRIAL_START',
      END: 'TRIAL_END',
    }
  }
};

function createNetworkServiceUserInBilling({ customerId, username, serviceId }) {
  logger.info(`>_: ATTEMPT CREATE SERVICE USER = username:${username}, serviceId:${serviceId}`);
  return new Promise((resolve, reject) => {
    const billingConf = helpers.billing.config({ customerId });
    const requestUrl = `${billingConf.host}/jbilling/rest/service/user`;
    const qs = {
      servicename: serviceId,
      username
    };
    request.put(requestUrl, {
      qs
    }, (err, httpResponse, billingResult) => {
      if (err) {
        logger.error(err);
        return reject(err);
      }
      let result;
      try {
        result = JSON.parse(billingResult);
      } catch (e) {
        logger.error(result);
        return reject(e);
      }
      if (result.error) {
        logger.error(result);
        reject(result);
      } else {
        resolve(result);
      }
    });
  });
}
function deleteNetworkServiceUserFromBilling({ customerId, username, serviceId }) {
  logger.info(`>_: ATTEMPT CREATE SERVICE USER = username:${username}, serviceId:${serviceId}`);
  return new Promise((resolve, reject) => {
    const billingConf = helpers.billing.config({ customerId });
    const requestUrl = `${billingConf.host}/jbilling/rest/service/user`;
    const qs = {
      servicename: serviceId,
      username
    };
    request.delete(requestUrl, {
      qs
    }, (err, httpResponse, billingResult) => {
      if (err) {
        logger.error(err);
        return reject(err);
      }
      let result;
      try {
        result = JSON.parse(billingResult);
      } catch (e) {
        logger.error(result);
        return reject(e);
      }
      if (result.error) {
        logger.error(result);
        reject(result);
      } else {
        resolve(result);
      }
    });
  });
}

function updateNetworkSubscriptionStatus({ customerId, prefix, nickname, suspend }) {
  logger.info(`>_: ATTEMPT CHANGE GATEWAY STATUS TO = ${suspend}`);
  return new Promise((resolve, reject) => {
    const billingConf = helpers.billing.config({ customerId });
    const requestUrl = `${billingConf.host}/jbilling/rest/gateway/suspend`;
    const qs = {
      reseller: nickname,
      suspend,
      prefix
    };
    request.get(requestUrl, {
      qs
    }, (err, httpResponse, billingResult) => {
      if (err) {
        logger.error(err);
        return reject(err);
      }
      let result;
      try {
        result = JSON.parse(billingResult);
      } catch (e) {
        logger.error(result);
        return reject(e);
      }
      if (result.error) {
        logger.error(result);
        reject(result);
      } else {
        resolve(result);
      }
    });
  });
}

function deleteNetworkFromBilling({ customerId, nickname }) {
  logger.info('>_: ATTEMPT DELETE NETWORK FROM BILLING');
  return new Promise((resolve, reject) => {
    const billingConf = helpers.billing.config({ customerId });
    const requestUrl = `${billingConf.host}/jbilling/rest/json/removeReseller`;
    const qs = {
      reseller: nickname,
    };
    request.get(requestUrl, {
      qs
    }, (err, httpResponse, billingResult) => {
      if (err) {
        logger.error(err);
        return reject(err);
      }
      let result;
      try {
        result = JSON.parse(billingResult);
      } catch (e) {
        logger.error(result);
        return reject(e);
      }
      if (result.error) {
        logger.error(result);
        reject(result);
      } else {
        resolve(result);
      }
    });
  });
}

function deleteNetworkFromSignaling({ networkId, }) {
  logger.info('>_: ATTEMPT DELETE NETWORK FROM SIGNALING');
  return new Promise((resolve, reject) => {
    const data = {
      vnId: networkId,
    };
    request.delete(`${config.get('openFire.host')}/plugins/zservlet/removeVN`, {
      qs: data,
      headers: {
        'Content-Type': 'application/json'
      }
    }, (err, httpResponse, result) => {
      if (err) {
        logger.error(err);
        return reject('SIGNALING_NETWORK_ERROR');
      }
      if (!result.err) {
        return resolve(result);
      }
      logger.error(result);
      return reject('SIGNALING_SERVICE_ERROR');
    });
  });
}


function deleteNetworkUserFromBilling({ customerId, username }) {
  logger.info('>_: ATTEMPT DELETE NETWORK USER FROM BILLING');
  return new Promise((resolve, reject) => {
    const billingConf = helpers.billing.config({ customerId });
    const requestUrl = `${billingConf.host}/jbilling/rest/json/setUserReseller`;
    const qs = {
      reseller: '',
      username,
    };
    request.get(requestUrl, {
      qs
    }, (err, httpResponse, billingResult) => {
      if (err) {
        logger.error(err);
        return reject(err);
      }
      let result;
      try {
        result = JSON.parse(billingResult);
      } catch (e) {
        logger.error(result);
        return reject(e);
      }
      if (result.error) {
        logger.error(result);
        reject(result);
      } else {
        resolve(result);
      }
    });
  });
}


function createNetworkUserInBilling({ customerId, username, nickname }) {
  logger.info('>_: ATTEMPT CREATE NETWORK USER IN BILLING');
  return new Promise((resolve, reject) => {
    const billingConf = helpers.billing.config({ customerId });
    const requestUrl = `${billingConf.host}/jbilling/rest/json/setUserReseller`;
    const qs = {
      reseller: nickname,
      username,
    };
    request.get(requestUrl, {
      qs
    }, (err, httpResponse, billingResult) => {
      if (err) {
        logger.error(err);
        return reject(err);
      }
      let result;
      try {
        result = JSON.parse(billingResult);
      } catch (e) {
        logger.error(result);
        return reject(e);
      }
      if (result.error) {
        logger.error(result);
        reject(result);
      } else {
        resolve(result);
      }
    });
  });
}


function deleteNetworkUserFromSignaling({ networkId, username }) {
  logger.info('>_: ATTEMPT DELETE NETWORK FROM SIGNALING');
  return new Promise((resolve, reject) => {
    const data = {
      vnId: networkId,
      username
    };
    request.delete(`${config.get('openFire.host')}/plugins/zservlet/removeUserVN`, {
      qs: data,
      headers: {
        'Content-Type': 'application/json'
      }
    }, (err, httpResponse, result) => {
      if (err) {
        logger.error(err);
        return reject('SIGNALING_NETWORK_ERROR');
      }
      if (!result.err) {
        return resolve(result);
      }
      logger.error(result);
      return reject('SIGNALING_SERVICE_ERROR');
    });
  });
}


async function getNetworks(db, { customerId, limit, offset }) {
  const client = db || sql.getDB();
  const recordsQuery = client
    .query(networkQueries.get.all.networks.records, [customerId, limit, offset]);
  const countQuery = client.query(networkQueries.get.all.networks.count, [customerId]);
  const [recordsQueryResult, countQueryResult] = await Promise.all([recordsQuery, countQuery]);
  return {
    records: recordsQueryResult.rows,
    count: +countQueryResult.rows[0].count,
  };
}

async function getNetwork(db, { customerId, networkId }) {
  const client = db || sql.getDB();
  const query = await client
    .query(networkQueries.get.one.network, [customerId, networkId]);
  return query.rows[0];
}


async function updateNetwork(db, params) {
  const {
    customerId, networkId,
    nickname = null, label, callName, description, isPublic = null
  } = params;

  const client = db || sql.getDB();
  const query = await client
    .query(networkQueries.update.network,
      [customerId, networkId, nickname, label, callName, description, isPublic]);
  return query.rows[0];
}

async function getNetworkUsers(db, { customerId, networkId, prefix, limit, offset }) {
  const client = db || sql.getDB();
  const recordsQuery = client
    .query(networkQueries.get.all.networkUsers.records,
      [customerId, networkId, prefix, limit, offset]);
  const countQuery = client.query(networkQueries.get.all.networkUsers.count,
    [customerId, networkId]);
  const [recordsQueryResult, countQueryResult] = await Promise.all([recordsQuery, countQuery]);
  return {
    records: recordsQueryResult.rows,
    count: +countQueryResult.rows[0].count,
  };
}

async function getNetworkUsersCount(db, { customerId, networkId }) {
  const client = db || sql.getDB();
  const countQuery = await client.query(networkQueries.get.all.networkUsers.count,
    [customerId, networkId]);
  return +countQuery.rows[0].count;
}


async function getNetworkUser(db, { customerId, networkId, userId, adminId }) {
  const client = db || sql.getDB();
  const query = await client
    .query(networkQueries.get.one.networkUser, [customerId, networkId, userId, adminId]);
  return query.rows[0];
}

async function deleteNetworkUser(db, { customerId, networkId, userId, adminId = null }) {

  console.log(JSON.stringify({ customerId, networkId, userId }))



  const client = await sql.getDB().connect();
  let result;
  try {
    await client.query('BEGIN');
    logger.info('> TRANSACTION START');
    const networkUser = await getNetworkUser(client, { customerId, networkId, userId, adminId });

    if (!networkUser) {
      throw new Error('NOT_JOINED');
    }

    const username = networkUser.username;

    try {
      await deleteNetworkUserFromBilling({ customerId, username });
    } catch (e) {
      logger.error('#####');
      logger.info(e);
      logger.info({ customerId, username });
      logger.error('#####');
    }
    await deleteNetworkUserFromSignaling({ networkId, username });

    if (adminId) {
      const kickQuery = await client.query(networkQueries.delete.networkUser.kick,
        [customerId, networkId, userId, adminId]);

      result = kickQuery.rows[0].network;
    } else {
      const leaveQuery = await client.query(networkQueries.delete.networkUser.leave,
        [customerId, userId, networkId]);
      result = leaveQuery.rows[0].network;
    }

    const command = adminId ? SERVER_MESSAGES.NETWORK.KICK : SERVER_MESSAGES.NETWORK.LEAVE;
    (async () => {
      await toServer.send({
        username,
        command,
        params: { networkId }
      });
    })().catch((err) => {
      logger.info(err);
    });


    await client.query('COMMIT');
  } catch (e) {
    logger.error(e);
    await client.query('ROLLBACK');
    throw e;
  } finally {
    logger.info('> TRANSACTION END');
    client.release();
  }

  return result;
}

async function createNetworkByRequest(db, params) {
  const client = db || sql.getDB();
  const { customerId, token } = params;
  const query = await client
    .query(networkQueries.create.networkByRequest, [customerId, token]);
  return query.rows[0];
}


async function getNetworksByEmailOrNickName(db, { customerId, nickname, email }) {
  const client = db || sql.getDB();
  const recordsQuery = await client
    .query(networkQueries.get.all.networks.byEmailOrNickName,
      [customerId, nickname, email]);
  return recordsQuery.rows;
}

async function getNetworkByInviteOrNickname(db, { customerId, token, username = null }) {
  const client = db || sql.getDB();
  const recordsQuery = await client
    .query(networkQueries.get.all.networks.byInviteOrNickname,
      [customerId, token, username]);
  return recordsQuery.rows[0];
}


async function createNetworkRequest(db, params) {
  const { customerId, email, password, nickname, networkFullName, firstName, lastName } = params;
  const client = db || sql.getDB();
  const requestQuery = await client
    .query(networkQueries.create.request,
      [customerId, email, password, nickname, networkFullName, firstName, lastName]);
  const requestedNetwork = requestQuery.rows[0];
  const emailTemplate = await emailService.get
    .one(client, { templateId: emailConstants.VERIFY_NETWORK_REQUEST });

  const message = utils.replaceAll(emailTemplate.content, {
    '{email}': requestedNetwork.email,
    '{link}': `https://zangi.com/network/verify?token=${requestedNetwork.token}`
  });
  await emailService.sendMail('zz')({ to: requestedNetwork.email, subject: emailTemplate.subject, message });
  return {
    email,
    nickname,
    firstName,
    lastName,
    message
  };
}


async function deleteNetwork(db, { customerId, networkId }) {
  const client = await sql.getDB().connect();
  try {
    await client.query('BEGIN');
    const network = await getNetwork(client, { customerId, networkId });
    await deleteNetworkFromSignaling({ networkId });
    try {
      await deleteNetworkFromBilling({ customerId, nickname: network.nickname });
    } catch (e) {
      // console.log(e);
      // console.log(network);
      // console.log(customerId);
    }

    await client.query(networkQueries.delete.network,
      [customerId, networkId]);


    (async () => {
      await toServer.broadcast({
        networkId,
        command: SERVER_MESSAGES.NETWORK.DELETE,
        params: { networkId }
      });
    })();

    await client.query('COMMIT');
  } catch (e) {
    logger.error(e);
    await client.query('ROLLBACK');
    throw e;
  } finally {
    logger.info('> TRANSACTION END');
    client.release();
  }
}


async function updateNetworkStatus(db, { customerId, networkId, statusId }) {
  const client = await sql.getDB().connect();
  try {
    await client.query('BEGIN');
    // const network = await getNetwork(client, { customerId, networkId });
    // await deleteNetworkFromSignaling({ networkId });
    // try {
    //   await deleteNetworkFromBilling({ customerId, nickname: network.nickname });
    // } catch (e) {
    //   console.log(e);
    //   console.log(network);
    //   console.log(customerId);
    // }

    await client.query(networkQueries.update.network,
      [customerId, networkId, statusId]);

    //
    // (async () => {
    //   await toServer.broadcast({
    //     networkId,
    //     command: SERVER_MESSAGES.NETWORK.DELETE,
    //     params: { networkId }
    //   });
    // })();

    await client.query('COMMIT');
  } catch (e) {
    logger.error(e);
    await client.query('ROLLBACK');
    throw e;
  } finally {
    logger.info('> TRANSACTION END');
    client.release();
  }
}


async function startTrialPeriod(db, { customerId, networkId }) {
  const client = await sql.getDB().connect();

  const result = {};
  try {
    await client.query('BEGIN');
    const network = await getNetwork(client, { customerId, networkId });
    const endedAt = Math.round(new Date(Date.now() + (3600 * 1000)).getTime() / 1000);
    // const endedAt = Math.round(new Date(Date.now() + 12096e5).getTime() / 1000);

    const trialPeriodQuery = await client.query(networkQueries.modules.subscription.trial,
      [network.networkId, endedAt]);

    const nickname = network.nickname;
    const suspend = false;
    const { prefix } = customerService.get.customerId(customerId);

    await updateNetworkSubscriptionStatus({ customerId, nickname, suspend, prefix });

    result.trial = trialPeriodQuery.rows[0];
    await client.query('COMMIT');
  } catch (e) {
    logger.error(e);
    await client.query('ROLLBACK');
    throw e;
  } finally {
    logger.info('> TRANSACTION END');
    client.release();
  }

  return result;
}

async function endTrialPeriod(db, { customerId = 1, networkId }) {
  const client = await sql.getDB().connect();

  const result = {};
  try {
    await client.query('BEGIN');
    const network = await getNetwork(client, { customerId, networkId });

    const endTrialQuery = await client.query(networkQueries.modules.subscription.endTrial,
      [network.networkId]);

    const nickname = network.nickname;
    const suspend = true;
    const { prefix } = customerService.get.customerId(customerId);

    await updateNetworkSubscriptionStatus({ customerId, nickname, suspend, prefix });

    result.trial = endTrialQuery.rows[0];

    await client.query('COMMIT');
  } catch (e) {
    logger.error(e);
    await client.query('ROLLBACK');
    throw e;
  } finally {
    logger.info('> TRANSACTION END');
    client.release();
  }

  return result;
}

async function createNetworkUser(db, { customerId, username, token }) {
  const client = await sql.getDB().connect();

  let result;
  try {
    await client.query('BEGIN');
    const networkUserQuery = await client.query(networkQueries.create.networkUser,
      [customerId, username, token]);

    const network = networkUserQuery.rows[0].network;

    if (network.service) {
      // TODO work ground change after
      network.callName = 'Zangi Out';
      const serviceId = network.service.serviceId;
      await createNetworkServiceUserInBilling({ customerId, username, serviceId });
    } else {
      const nickname = network.nickname;

      try {
        await createNetworkUserInBilling({ customerId, username, nickname });
      } catch (e) {
        logger.error(e);
      }
    }
    try {
      await toServer.send({
        username,
        command: SERVER_MESSAGES.NETWORK.JOIN,
        params: { ...network }
      });
    } catch (e) {
      logger.error(e);
    }

    result = network;

    await client.query('COMMIT');
  } catch (e) {
    logger.error(e);
    await client.query('ROLLBACK');
    throw e;
  } finally {
    logger.info('> TRANSACTION END');
    client.release();
  }

  return result;
}


async function createNetworkByAdmin(db, params) {
  const { customerId, nickname, label, callName, description, isPublic } = params;
  const client = db || sql.getDB();
  const query = await client
    .query(networkQueries.create.networkByAdmin,
      [customerId, nickname, label, callName, description, isPublic]);

  return query.rows[0];
}

async function getNetworkLocalState(db, params) {
  const { networkId } = params;
  const client = db || sql.getDB();
  const query = await client
    .query(networkQueries.get.state,
      [networkId]);

  return query.rows[0];
}


async function getNetworkByConsumer(db, { customerId, consumerSecret }) {
  const client = db || sql.getDB();
  const query = await client
    .query(networkQueries.retrieve.consumerNetwork, [customerId, consumerSecret]);
  if (query.rowCount === 0) {
    throw new Error('INVALID_CONSUMER');
  }

  return query.rows[0];
}


module.exports = {
  get: {
    all: {
      networks: getNetworks,
      networkUsers: getNetworkUsers,
      networkByEmailOrNickname: getNetworksByEmailOrNickName,
    },
    one: {
      network: getNetwork,
      networkUser: getNetworkUser,
      byInviteOrNickname: getNetworkByInviteOrNickname
    },
    count: {
      networkUsers: getNetworkUsersCount
    },
    localState: getNetworkLocalState
  },
  create: {
    request: createNetworkRequest,
    networkWithRequest: createNetworkByRequest,
    byAdmin: createNetworkByAdmin,
    networkUser: createNetworkUser
  },
  delete: {
    networkUser: deleteNetworkUser,
    network: deleteNetwork,
  },
  update: {
    network: updateNetwork,
    networkStatus: updateNetworkStatus,
  },
  endTrial: endTrialPeriod,
  startTrial: startTrialPeriod,
  NETWORK_CONSTANTS,
  retrieve: {
    consumer: getNetworkByConsumer
  }
};
