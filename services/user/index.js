const config = require('config');
const request = require('request');
const sql = require('../db');
const logger = require('../logger');
const redisService = require('../redis');
const helpers = require('../../helpers');
const crypto = require('crypto');


const openFireConf = config.get('openFire');
const openFireHeader = { 'Content-Type': 'application/json', Authorization: openFireConf.secret };

const userQueries = sql.queries.users;
const networkUserQueries = sql.queries.networkUsers;
const channelUserQueries = sql.queries.channelUsers;


function lock(username, doLock) {
  if (typeof doLock === 'string') {
    return new Promise((resolve, reject) => {
      request.get(`${openFireConf.host}/plugins/zservlet/getuserlockout`,
        { qs: { username }, headers: openFireHeader },
        (err, httpResponse, result) => {
          if (err) {
            global.log.error(err);
            return reject(err);
          }
          let isLocked = true;
          try {
            isLocked = JSON.parse(result);
          } catch (e) {
            global.log.error(e);
            global.log.error(result);
            return reject({ result, e });
          }
          resolve({ isLocked: !!isLocked });
        });
    });
  }
  return new Promise((resolve, reject) => {
    const action = doLock ? request.post : request.delete;
    action(`${openFireConf.host}/plugins/restapi/v1/lockouts/${username}`,
      { headers: openFireHeader },
      (err, httpResponse) => {
        if (err) {
          global.log.error(err);
          return reject(err);
        }
        let isLocked = true;
        if (httpResponse.statusCode === 201 && doLock) {
          isLocked = true;
        } else if (httpResponse.statusCode === 200 && !doLock) {
          isLocked = false;
        } else {
          return reject('INVALID_OPERATION');
        }
        resolve({ isLocked });
      });
  });
}

function terminateBilling({ prefix, username }) {
  return new Promise((resolve, reject) => {
    const billingConf = config.get(`billing.${helpers.getConfigKey(prefix)}`);
    request.get(`${billingConf.host}/jbilling/rest/json/deleteUserJson`,
      { qs: { username } },
      (err, httpResponse, result) => {
        if (err) {
          logger.error(err);
          return reject(err);
        }
        logger.info(result);
        let terminated;
        try {
          terminated = !!result;
          if (!result.error) {
            terminated = true;
          } else {
            throw Error('BILLING_ERROR');
          }
        } catch (e) {
          logger.error(e);
          logger.error(result);
          return reject(result);
        }
        resolve(null, terminated);
      });
  });
}


function createUserBilling({ prefix, username, regionCode, firstName, lastName }) {
  return new Promise((resolve, reject) => {
    const billingConf = config.get(`billing.${helpers.getConfigKey(prefix)}`);
    request.get(`${billingConf.host}/jbilling/rest/json/createUserPromoPrefixJson`,
      {
        qs: {
          prefix,
          username,
          firstname: firstName || '',
          lastname: lastName || '',
          regionCode,
          password: username,
          email: '',
          promoCount: 0,
          currency: '',
          reseller: ''
        }
      },
      (err, httpResponse, result) => {
        if (err) {
          logger.error(err);
          return reject(err);
        }
        logger.info(result);
        let user;
        try {
          user = JSON.parse(result);
        } catch (e) {
          logger.error(e);
          logger.error(result);
          return reject(result);
        }
        resolve(null, user.result);
      });
  });
}

function terminateSignalling({ username }) {
  return new Promise((resolve, reject) => {
    request.delete(`${openFireConf.host}/plugins/zservlet/cleanUserData`,
      { headers: openFireHeader, qs: { username } },
      (err, httpResponse, result) => {
        if (err) {
          logger.error(err);
          return reject(err);
        }
        logger.info(result);
        let terminated;
        try {
          terminated = result;
        } catch (e) {
          logger.error(e);
          logger.error(result);
          return reject(result);
        }
        resolve(null, terminated);
      });
  });
}

function getUser(client, { customerId, userId }) {
  return new Promise(async (resolve, reject) => {
    const db = client || sql.getDB();
    try {
      const sqlResult = await db.query(userQueries.getUser, [customerId, userId]);
      const result = sqlResult.rows[0];
      logger.info(result);
      if (result) {
        resolve(result);
      } else {
        reject('INVALID_USER');
      }
    } catch (e) {
      logger.error(e);
      reject(e);
    }
  });
}

async function killHim({ customerId, prefix, userId }) {
  const client = await sql.getDB().connect();
  try {
    await client.query('BEGIN');
    logger.info('> Transaction began');

    const user = await getUser(client, { customerId, userId });
    logger.info(user);
    if (prefix !== 'ns') {
      await terminateBilling({ prefix, username: user.username });
    }
    await terminateSignalling({ username: user.username });

    const servicesHost = config.get('services.host');
    const number = user.username.replace(prefix, '');
    const checksum = crypto.createHash('md5').update(`hyehqwtyeftjkynmqy647sdf${prefix}${number}`).digest('hex');
    request.get(`${servicesHost}/zangiServices/v3/removeUser/${prefix}`, {
      qs: {
        number,
        checksum
      },
      headers: {
        'Content-Type': 'application/json'
      },
      rejectUnauthorized: false
    }, (err, httpResponse, result) => {
      if (err) {
        logger.error(err);
        throw new Error('NETWORK_ERROR');
      }
      if (!result || result.status === 'FAILED') {
        logger.error(result);
        throw new Error('NETWORK_ERROR');
      }
      return result;
    });
    await client.query('COMMIT');
  } catch (e) {
    logger.error(e);
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

function getDIDNumber({ prefix, username }) {
  return new Promise((resolve, reject) => {
    const billingConf = config.get(`billing.${helpers.getConfigKey(prefix)}`);
    request.get(`${billingConf.host}/jbilling/rest/json/getDIDNumberJson`,
      { qs: { username } },
      (err, httpResponse, result) => {
        if (err) {
          logger.error(err);
          return reject(err);
        }
        logger.info(result);

        let didNumber;
        try {
          const billingResult = JSON.parse(result);
          if (billingResult.error) {
            return reject('BILLING_SERVICE_ERROR');
          }
          didNumber = billingResult.result;
        } catch (e) {
          logger.error(e);
          logger.error(result);
          return reject(result);
        }
        resolve(didNumber);
      });
  });
}

function updateDIDNumber({ prefix, username, didNumber }) {
  return new Promise((resolve, reject) => {
    const billingConf = config.get(`billing.${helpers.getConfigKey(prefix)}`);
    request.post(`${billingConf.host}/jbilling/rest/json/setDIDNumberJson`,
      { qs: { username, didNumber } },
      (err, httpResponse, result) => {
        if (err) {
          logger.error(err);
          return reject(err);
        }
        logger.info(result);
        let didNumber;
        try {
          const billingResult = JSON.parse(result);
          if (billingResult.error) {
            return reject(`Cannot set did number: ${didNumber} as the number is CLI number.`);
          }
          didNumber = billingResult.result;
        } catch (e) {
          logger.error(e);
          logger.error(result);
          return reject(result);
        }
        resolve(didNumber);
      });
  });
}

function deleteDIDNumber({ prefix, username }) {
  return new Promise((resolve, reject) => {
    const billingConf = config.get(`billing.${helpers.getConfigKey(prefix)}`);
    request.post(`${billingConf.host}/jbilling/rest/json/deleteDIDNumberJson`,
      { qs: { username } },
      (err, httpResponse, result) => {
        if (err) {
          logger.error(err);
          return reject(err);
        }
        logger.info(result);
        let deleted;
        try {
          const billingResult = JSON.parse(result);
          if (billingResult.error) {
            return reject('BILLING_SERVICE_ERROR');
          }
          deleted = billingResult.result;
        } catch (e) {
          logger.error(e);
          logger.error(result);
          return reject(result);
        }
        resolve(deleted);
      });
  });
}

async function getUsers(queryParams) {
  const {
    customerId, number, registrationStartDate, registrationEndDate,
    activityStartDate, activityEndDate, countryId, platformId,
    userId, networkId, callCountFrom, callCountTo, messageCountFrom,
    messageCountTo, durationFrom, durationTo, email, userGroupId, limit,
    offset, channelName, nickname, nickEmail, byDate, subscribed,
  } = queryParams;
  const getUserSqlPropName = byDate ? 'recordsByDate' : 'records';
  const getUserSqlPropNameWithoutChannel = byDate ? 'recordsWidthoutChannelByDate' : 'recordsWidthoutChannel';

  if (channelName) {
    const recordsQuery = await sql.getDB()
      .query(userQueries.get[getUserSqlPropName],
        [customerId, registrationStartDate,
          registrationEndDate, activityStartDate,
          activityEndDate, countryId, platformId, userId, networkId,
          callCountFrom, callCountTo, messageCountFrom, messageCountTo,
          durationFrom, durationTo, number, email, userGroupId, limit, offset,
          channelName, nickname, nickEmail, subscribed]);
    return recordsQuery.rows;
  }
  const recordsQuery = await sql.getDB()
    .query(userQueries.get[getUserSqlPropNameWithoutChannel],
      [customerId, registrationStartDate,
        registrationEndDate, activityStartDate,
        activityEndDate, countryId, platformId, userId, networkId,
        callCountFrom, callCountTo, messageCountFrom, messageCountTo,
        durationFrom, durationTo, number, email, userGroupId, limit,
        offset, channelName, nickname, nickEmail, subscribed]);
  return recordsQuery.rows;
}

async function getNetworkUsers(queryParams) {
  const {
    customerId, registrationStartDate, registrationEndDate,
    activityStartDate, activityEndDate, countryId, platformId,
    userId, networkId, callCountFrom, callCountTo, messageCountFrom,
    messageCountTo, durationFrom, durationTo, prefix, limit, offset
  } = queryParams;

  const recordsQuery = await sql.getDB()
    .query(networkUserQueries.get.records,
      [customerId, registrationStartDate,
        registrationEndDate, activityStartDate,
        activityEndDate, countryId, platformId, userId, networkId,
        callCountFrom, callCountTo, messageCountFrom, messageCountTo,
        durationFrom, durationTo, prefix, limit, offset]);


  return recordsQuery.rows;
}

async function getUsersCount(queryParams) {
  const {
    customerId, registrationStartDate, registrationEndDate,
    activityStartDate, activityEndDate, countryId, platformId,
    userId, networkId, callCountFrom, callCountTo, messageCountFrom,
    messageCountTo, durationFrom, durationTo, number, email, userGroupId,
    channelName, nickname, nickEmail, byDate, subscribed,
  } = queryParams;

  const getUsersCountSqlPropName = byDate ? 'countByDate' : 'count';
  const getUsersCountSqlPropNameWithoutChannel = byDate ? 'countWidthoutChannelByDate' : 'countWidthoutChannel';

  if (channelName) {
    const countQuery = await sql.getDB().query(userQueries.get[getUsersCountSqlPropName], [
      customerId, registrationStartDate,
      registrationEndDate, activityStartDate,
      activityEndDate, countryId, platformId, userId, networkId,
      callCountFrom, callCountTo, messageCountFrom, messageCountTo,
      durationFrom, durationTo, number, email, userGroupId,
      channelName, nickname, nickEmail, subscribed]);

    return +countQuery.rows[0].count;
  }
  const countQuery =
    await sql.getDB().query(userQueries.get[getUsersCountSqlPropNameWithoutChannel], [
      customerId, registrationStartDate,
      registrationEndDate, activityStartDate,
      activityEndDate, countryId, platformId, userId, networkId,
      callCountFrom, callCountTo, messageCountFrom, messageCountTo,
      durationFrom, durationTo, number, email, userGroupId,
      nickname, nickEmail, subscribed]);

  return +countQuery.rows[0].count;
}


async function getNetworkUsersCount(queryParams) {
  const {
    customerId, registrationStartDate, registrationEndDate,
    activityStartDate, activityEndDate, countryId, platformId,
    userId, networkId, callCountFrom, callCountTo, messageCountFrom,
    messageCountTo, durationFrom, durationTo
  } = queryParams;

  const countQuery = await sql.getDB().query(networkUserQueries.get.count, [
    customerId, registrationStartDate,
    registrationEndDate, activityStartDate,
    activityEndDate, countryId, platformId, userId, networkId,
    callCountFrom, callCountTo, messageCountFrom, messageCountTo,
    durationFrom, durationTo]);

  return +countQuery.rows[0].count;
}


async function getTotalUsersCount({ customerId, networkId = null }) {
  const countQuery = await sql.getDB()
    .query(userQueries.total.users.count, [customerId, networkId]);
  return +countQuery.rows[0].count;
}


async function getUserByUsername(client, { customerId, username }) {
  console.log('######');


  const db = client || sql.getDB();
  const sqlResult = await db.query(userQueries.getUserByUsername, [customerId, username]);
  return sqlResult.rows[0];
}

async function getUserByEmail(client, { customerId, email }) {
  if (!email) {
    return null;
  }
  const db = client || sql.getDB();
  const sqlResult = await db.query(userQueries.getUserByEmail, [customerId, email]);
  return sqlResult.rows[0];
}

async function getUserbyNickname(client, { customerId, nickname }) {
  if (!nickname) {
    return null;
  }
  const db = client || sql.getDB();
  const sqlResult = await db.query(userQueries.getUserByNickname, [customerId, nickname]);
  return sqlResult.rows[0];
}


async function createUser({ customerId, prefix, phoneNumber, password, nickname, regionCode, email = null }) {
  const client = await sql.getDB().connect();

  try {
    await client.query('BEGIN');
    logger.info('> Transaction began');

    const username = prefix + phoneNumber;


    const userQueryPromise = getUserByUsername(client, { customerId, username });
    const emailQueryPromise = getUserByEmail(client, { customerId, email });
    const nicknameQueryPromise = getUserbyNickname(client, { customerId, nickname });

    console.log('#### 1 #####');
    console.log({ email, username, customerId });
    console.log('#### end 1 #####');

    const [userQuery, emailQuery, nicknameQuery] =
        await Promise.all([userQueryPromise, emailQueryPromise, nicknameQueryPromise]);

    console.log('#### 2 #####');

    console.log({ userQuery, emailQuery });
    console.log('#### end 2 #####');

    if ((userQuery && userQuery.status && userQuery.status !== 2) ||
        (emailQuery && emailQuery.status && emailQuery.status !== 2) ||
        (nicknameQuery && nicknameQuery.status && nicknameQuery.status !== 2)) {
      throw new Error('USER_ALREADY_EXIST');
    }
    if (prefix !== 'ns') {
      await createUserBilling({ prefix, username, regionCode });
    }
    let createUserQuery;

    if ((userQuery && userQuery.status && Number(userQuery.status) === 2) ||
        (emailQuery && emailQuery.status && Number(emailQuery.status) === 2) ||
        (nicknameQuery && nicknameQuery.status && Number(nicknameQuery.status) === 2)) {
      if (userQuery) {
        createUserQuery = await client.query(userQueries.recreate, [userQuery.userId, password]);
      } else if (emailQuery) {
        createUserQuery = await client.query(userQueries.recreate, [emailQuery.userId, password]);
      } else if (nicknameQuery) {
        createUserQuery =
            await client.query(userQueries.recreate, [nicknameQuery.userId, password]);
      }
    } else {
      createUserQuery =
          await client.query(
            userQueries.create,
            [customerId, username, password, regionCode, email, nickname]
          );
    }
    const createdUser = createUserQuery.rows[0];
    const createdUserId = createdUser.userId;

    const getUserCacheQuery = await client.query(userQueries.createCache, [createdUserId]);
    const getUserCache = getUserCacheQuery.rows[0];
    const userCacheData = JSON.stringify(getUserCache);

    await redisService.commands.hset('userConfig', username, userCacheData);
    logger.info(getUserCache);
    await client.query('COMMIT');
    return getUserCache;
  } catch (e) {
    logger.error(e);
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}


async function getNotVerifiedUsers(queryParams) {
  const {
    customerId, username, email, regionCode, platformId, startDate, endDate, prefix, limit, offset
  } = queryParams;
  const recordsQuery = await sql.getDB()
    .query(userQueries.notVerified.get.all.records,
      [customerId, username, email, regionCode, platformId,
        startDate, endDate, prefix, limit, offset]);
  return recordsQuery.rows;
}


async function getNotVerifiedUsersCount(queryParams) {
  const {
    customerId, username, email, regionCode, platformId, startDate, endDate
  } = queryParams;

  const countQuery = await sql.getDB().query(userQueries.notVerified.get.all.count,
    [customerId, username, email, regionCode, platformId, startDate, endDate]);

  return +countQuery.rows[0].count;
}

async function getPreUsers(queryParams) {
  const { customerId, limit, offset } = queryParams;
  const recordsQuery = await sql.getDB().query(userQueries.preUsers.get.all.records, [customerId, limit, offset]);
  return recordsQuery.rows;
}

async function getPreUsersCount(queryParams) {
  const { customerId } = queryParams;

  const countQuery = await sql.getDB().query(userQueries.preUsers.get.all.count, [customerId]);

  return +countQuery.rows[0].count;
}

async function getUserAttempts(client, { customerId, username, prefix, limit, offset }) {
  const db = client || sql.getDB();
  const sqlResult = await db.query(userQueries.attempts.get.all.records,
    [customerId, username, prefix, limit, offset]);
  return sqlResult.rows;
}

async function getUserAttemptsCount(client, { customerId, username }) {
  const db = client || sql.getDB();
  const sqlResult = await db.query(userQueries.attempts.count.total, [customerId, username]);
  return sqlResult.rows[0];
}

async function getUserDailyAttemptsCount(...args) {
  const client = typeof args[0] === 'object' ? null : args[0];
  const params = typeof args[0] === 'object' ? args[0] : args[1];

  const { customerId, username } = params;

  const db = client || sql.getDB();
  const sqlResult = await db.query(userQueries.attempts.count.daily, [customerId, username]);
  return sqlResult.rows[0];
}


async function resetDailyUserAttempts(client, { customerId, username }) {
  const db = client || sql.getDB();
  const sqlResult = await db.query(userQueries.attempts.reset.daily, [customerId, username]);
  return sqlResult.rows;
}

async function resetTotalUserAttempts(client, { customerId, username }) {
  const db = client || sql.getDB();
  const sqlResult = await db.query(userQueries.attempts.reset.total, [customerId, username]);
  return sqlResult.rows;
}


async function getUsersByUsername(db, params) {
  const { customerId, networkId = null, serviceId = null, usernameList } = params;
  const client = db || sql.getDB();
  const sqlResult = await client
    .query(userQueries.checkUserByUsername,
      [customerId, networkId, serviceId, JSON.stringify(usernameList)]);
  logger.info(sqlResult);
  return sqlResult.rows;
}

async function getUsersByEmail(db, params) {
  const { customerId, networkId = null, serviceId = null, emails } = params;
  const client = db || sql.getDB();
  const sqlResult = await client
    .query(userQueries.checkUserByEmail,
      [customerId, networkId, serviceId, JSON.stringify(emails)]);
  logger.info(sqlResult);
  return sqlResult.rows;
}

async function getUserById(db, { customerId, userId }) {
  const client = db || sql.getDB();
  const sqlResult = await client
    .query(userQueries.getUserById, [customerId, userId]);
  return sqlResult.rows[0];
}

async function searchUserByMobilePattern(db, {
  customerId, prefix, networkId = null, q, limit, offset
}) {
  const client = db || sql.getDB();
  const sqlResult = await client
    .query(userQueries.search.user, [customerId, prefix, networkId, q, limit, offset]);
  return sqlResult.rows;
}

async function searchUserByEmailOrNicknamePattern(db, {
  customerId, q
}) {
  const client = db || sql.getDB();
  const sqlResult = await client
    .query(userQueries.search.userByEmailOrNickname, [customerId, q]);
  return sqlResult.rows;
}


async function getUsernamePin({ username }) {
  const cache = await redisService.commands.hget('verify_code', username);
  const result = cache ? JSON.parse(cache) : null;
  return (result && result.verifyCode) || '';
}

async function deleteUser({ customerId, prefix, userId }) {
  const client = await sql.getDB().connect();
  try {
    await client.query('BEGIN');
    logger.info('> Transaction began');

    const user = await getUser(client, { customerId, userId });
    await terminateBilling({ prefix, username: user.username });
    await terminateSignalling({ username: user.username });

    logger.info(user);
    await client
      .query('SELECT backend."deleteUser"($1, $2)', [
        user.customerId,
        user.userId
      ]);
    await client.query('COMMIT');
  } catch (e) {
    logger.error(e);
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

async function editUser({ userId, newPassword }) {
  const client = await sql.getDB().connect();
  try {
    const sqlResult = await client.query(userQueries.recreate, [userId, newPassword]);
    return sqlResult.rows[0];
  } catch (e) {
    logger.error(e);
    throw e;
  }
}

async function getChannelUsers(queryParams) {
  const {
    customerId, registrationStartDate, registrationEndDate,
    activityStartDate, activityEndDate, countryId, platformId,
    userId, channelId, callCountFrom, callCountTo, messageCountFrom,
    messageCountTo, durationFrom, durationTo, prefix, limit, offset
  } = queryParams;

  const recordsQuery = await sql.getDB()
    .query(channelUserQueries.get.records,
      [customerId, registrationStartDate,
        registrationEndDate, activityStartDate,
        activityEndDate, countryId, platformId, userId, channelId,
        callCountFrom, callCountTo, messageCountFrom, messageCountTo,
        durationFrom, durationTo, prefix, limit, offset]);


  return recordsQuery.rows;
}

async function getChannelUsersCount(queryParams) {
  const {
    customerId, registrationStartDate, registrationEndDate,
    activityStartDate, activityEndDate, countryId, platformId,
    userId, channelId, callCountFrom, callCountTo, messageCountFrom,
    messageCountTo, durationFrom, durationTo
  } = queryParams;

  const countQuery = await sql.getDB().query(channelUserQueries.get.count, [
    customerId, registrationStartDate,
    registrationEndDate, activityStartDate,
    activityEndDate, countryId, platformId, userId, channelId,
    callCountFrom, callCountTo, messageCountFrom, messageCountTo,
    durationFrom, durationTo]);

  return +countQuery.rows[0].count;
}

async function searchChannelUserByMobilePattern(db, {
  customerId, prefix, channelId = null, q, limit, offset
}) {
  const client = db || sql.getDB();
  const sqlResult = await client
    .query(userQueries.search.channelUser, [customerId, prefix, channelId, q, limit, offset]);
  return sqlResult.rows;
}

async function getChannelUsersByUsername(db, params) {
  const { customerId, channelId = null, usernameList } = params;
  const client = db || sql.getDB();
  const sqlResult = await client
    .query(userQueries.checkChannelUserByUsername,
      [customerId, channelId, JSON.stringify(usernameList)]);
  logger.info(sqlResult);
  return sqlResult.rows;
}

async function getKilledUsers(client, params) {
  const { customerId, startDate, registrationStartDate, registrationEndDate, haveDevice } = params;
  const db = client || sql.getDB();
  const sqlResult = await db.query(userQueries.getKilledUsers, [
    customerId,
    startDate,
    registrationStartDate,
    registrationEndDate,
    haveDevice,
  ]);
  return sqlResult.rows;
}

module.exports = {
  lock,
  killHim,
  didNumbers: {
    get: getDIDNumber,
    update: updateDIDNumber,
    delete: deleteDIDNumber,
  },
  users: {
    getAll: {
      records: getUsers,
      count: getUsersCount,
      killedUsers: getKilledUsers,
    },
    create: createUser
  },
  networkUsers: {
    getAll: {
      records: getNetworkUsers,
      count: getNetworkUsersCount,
    }
  },
  channelUsers: {
    getAll: {
      records: getChannelUsers,
      count: getChannelUsersCount,
    }
  },
  notVerified: {
    getAll: {
      records: getNotVerifiedUsers,
      count: getNotVerifiedUsersCount,
    }
  },
  preUsers: {
    getAll: {
      records: getPreUsers,
      count: getPreUsersCount,
    }
  },
  attempts: {
    getAll: {
      records: getUserAttempts,
      count: getUserAttemptsCount
    },
    reset: {
      daily: resetDailyUserAttempts,
      total: resetTotalUserAttempts,
    },
    count: {
      total: getUserAttemptsCount,
      daily: getUserDailyAttemptsCount,
    },
    getPin: getUsernamePin
  },
  channel: {
    get: {
      users: getChannelUsersByUsername,
    }
  },
  network: {
    get: {
      users: getUsersByUsername,
      usersByEmail: getUsersByEmail
    }
  },
  search: {
    user: searchUserByMobilePattern,
    userByEmailOrNickname: searchUserByEmailOrNicknamePattern,
    channelUser: searchChannelUserByMobilePattern
  },
  getTotalUsersCount,
  retrieve: {
    userById: getUserById
  },
  delete: {
    user: deleteUser
  },
  edit: {
    user: editUser
  }
};
