const express = require('express');
const async = require('async');
const userService = require('../../services/user');
const redisService = require('../../services/redis');
const logger = require('../../services/logger');
const sql = require('../../services/db').getDB();
const sqlDB = require('../../services/db');
const { INFO_TYPE } = require('../../helpers/constants');
const helpers = require('../../helpers');
const zlib = require('zlib');
const config = require('config');
const request = require('request');
const { Client } = require('@elastic/elasticsearch');


const router = express.Router();

const userQueries = sqlDB.queries.users;

/**
 * URL: /v1/users
 * METHOD: GET
 * Description: GET users
 */

router.get('/', async (req, res) => {
  req.checkQuery({
    offset: {
      notEmpty: true,
      isNumber: true
    },
    limit: {
      optional: true,
      isNumber: true
    },
    startDate: {
      optional: true,
      isDate: true
    },
    endDate: {
      optional: true,
      isDate: true
    }
  });

  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: 'VALIDATION_ERROR', result: errors });
  }

  const customerId = req.customerId;
  const prefix = req.administrator.customer.prefix;

  const limit = parseInt(req.query.limit, 10) || 50;
  const offset = (req.query.offset) * limit;
  const startDate = req.query.startDate;
  const endDate = req.query.endDate;

  const sqlParams = [customerId, prefix, startDate, endDate, limit, offset];

  try {
    const sqlResult = await sql.query(userQueries.getUsers, sqlParams);
    logger.info(sqlResult.rows.length);
    res.json({ err: false, result: sqlResult.rows });
  } catch (e) {
    global.log.error(e);
    res.json({ err: true, err_msg: 'DB_ERROR', result: e });
  }
});

/**
 * URL: /v1/users/:infoType
 * METHOD: GET
 * Description: GET users
 */

router.get('/info/:infoType', (req, res) => {
  req.checkParams({
    infoType: {
      notEmpty: true,
      isUsersInfoType: true
    }
  });
  req.checkQuery({
    startDate: {
      notEmpty: true,
    },
    endDate: {
      notEmpty: true,
    },
    offset: {
      optional: true
    }
  });

  const errors = req.validationErrors(true);

  if (errors) {
    return res.json({ err: true, err_msg: errors }).send();
  }

  const usersInfoType = req.params.infoType;
  const startDate = req.query.startDate;
  const endDate = req.query.endDate;
  const limit = 50;
  const offset = (req.query.offset) * limit;
  const prefix = req.administrator.customer.prefix;

  switch (usersInfoType) {
    case INFO_TYPE.USERS.REGISTERED_USERS:
      global.sql.run('users-get-registered-count', [startDate, endDate, req.customerId], (err, rows) => {
        if (err) {
          global.log.error(err);
          return res.status(200).json({
            err: true,
            err_msg: err,
          }).send();
        }
        let count = 0;
        if (rows.length > 0) {
          count = rows
              .map(row => parseInt(row.count, 10))
              .reduce((total, count) => total + count);
        }
        return res.status(200).json({ err: false, result: { count, list: rows } }).send();
      });
      break;
    case INFO_TYPE.USERS.UNREGISTERED_USERS:
      global.sql.run('users-get-unregistered-count', [startDate, endDate, req.customerId], (err, rows) => {
        if (err) {
          global.log.error(err);
          return res.status(200).json({
            err: true,
            err_msg: err,
          }).send();
        }
        let count = 0;
        if (rows.length > 0) {
          count = rows
              .map(row => parseInt(row.count, 10))
              .reduce((total, count) => total + count);
        }
        return res.status(200).json({ err: false, result: { count, list: rows } }).send();
      });
      break;
    case INFO_TYPE.USERS.UNREGISTERED_USERS_LIST:
      const sql = {
        params: [prefix, startDate, endDate, limit, offset, req.customerId]
      };
      console.log(sql);
      global.sql.run('users-get-unregistered-list', sql.params, (err, result) => {
        if (err) {
          global.log.error(err);
          return res.status(200).json({
            err: true,
            err_msg: err,
          }).send();
        }
        return res.status(200).json({ err: false, result }).send();
      });
      break;
    default:
      return res.json({ err: true, err_msg: 'UNKNOWN_ERROR' }).send();
  }
});


/**
 * URL: /v1/users/:username/unregistered
 * METHOD: GET
 * Description: GET user attempts
 */

router.get('/:username/unregistered', (req, res) => {
  req.checkParams({
    username: {
      notEmpty: true,
    }
  });
  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: false, err_msg: errors }).send();
  }
  const prefix = req.administrator.customer.prefix;
  const username = `${prefix}${req.params.username}`;
  const getUserAttemptsData = (prefix, username) => new Promise((resolve, reject) => {
    global.sql.run('get-username-attempts', [prefix, username, 5000, 0], (err, attempts) => {
      if (err) {
        reject({ err: true, err_msg: err });
      }
      if (attempts.length > 0) {
        resolve(attempts);
      } else {
        reject('NOT_FOUND');
      }
    });
  });
  const getUserCache = username => new Promise((resolve, reject) => {
    redisService.getCache().hget('verify_code', username, (err, verification) => {
      if (err) {
        reject({ err: true, err_msg: err });
      }
      resolve(verification || {});
    });
  });
  Promise
      .all([
        getUserAttemptsData(prefix, username),
        getUserCache(username)
      ])
      .then((result) => {
        const [userAttempts, userCache] = result;
        return res
            .status(200)
            .json({
              err: false,
              result: {
                attempts: userAttempts,
                verification: userCache
              }
            })
            .send();
      })
      .catch(err => res
          .status(200)
          .json({
            err: true,
            err_msg: err
          })
          .send());
});

/**
 * URL: /v1/users/:pattern/search
 * METHOD: GET
 * Description: Search user by pattern
 */

router.get('/:number/search', async (req, res) => {
  req.checkParams({
    number: {
      notEmpty: true,
      isNumber: true
    }
  });
  req.checkQuery({
    limit: {
      optional: true,
      isNumber: true
    },
    offset: {
      notEmpty: true,
      isNumber: true
    }
  });
  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: 'VALIDATION_ERROR', result: errors });
  }
  const customerId = req.customerId;
  const prefix = req.administrator.customer.prefix;

  const number = req.params.number;
  const limit = parseInt(req.query.limit, 10) || 10;
  const offset = (req.query.offset) * limit;


  const sqlParams = [customerId, prefix, number, limit, offset];
  logger.info(sqlParams);

  try {
    const sqlResult = await sql.query(userQueries.searchUser, sqlParams);
    logger.info(sqlResult);
    res.json({ err: false, result: sqlResult.rows });
  } catch (e) {
    global.log.error(e);
    res.json({ err: true, err_msg: 'DB_ERROR', result: e });
  }
});


/**
 * URL: /v1/users/:phoneNumber/lock
 * METHOD: POST
 * Description: POST Lock user
 */

router.post('/:number/lock', async (req, res) => {
  req.checkParams({
    number: {
      notEmpty: true,
      isNumber: true
    }
  });
  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: 'VALIDATION_ERROR', result: errors }).send();
  }

  const number = req.params.number;
  const username = req.administrator.customer.prefix + number;

  try {
    const lockResult = await userService.lock(username, true);
    res.json({ err: false, result: lockResult });
  } catch (e) {
    console.log(e);
    res.json({ err: true, err_msg: 'SIGNALING_ERROR' });
  }
});


/**
 * URL: /v1/users/:phoneNumber/lock
 * METHOD: DELETE
 * Description: DELETE  Unlock user
 */

router.delete('/:number/lock', async (req, res) => {
  req.checkParams({
    number: {
      notEmpty: true,
      isNumber: true
    }
  });
  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: 'VALIDATION_ERROR', result: errors });
  }
  const number = req.params.number;
  const username = req.administrator.customer.prefix + number;

  try {
    const lockResult = await userService.lock(username);
    res.json({ err: false, result: lockResult });
  } catch (e) {
    res.json({ err: true, err_msg: 'SIGNALING_ERROR' });
  }
});

/**
 * URL: /v1/users/:phoneNumber/lock
 * METHOD: GET
 * Description: GET user lock state
 */

router.get('/:number/lock', async (req, res) => {
  req.checkParams({
    number: {
      notEmpty: true,
      isNumber: true
    }
  });
  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: 'VALIDATION_ERROR', result: errors });
  }

  const number = req.params.number;
  const username = req.administrator.customer.prefix + number;

  try {
    const lockResult = await userService.lock(username, 'GET');
    res.json({ err: false, result: lockResult });
  } catch (e) {
    res.json({ err: true, err_msg: 'SIGNALING_ERROR' });
  }
});


/**
 * URL: /v1/users/:userId
 * METHOD: DELETE
 * Description: DELETE user
 */

router.delete('/:userId', async (req, res) => {
  req.checkParams({
    userId: {
      notEmpty: true,
    }
  });

  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: 'VALIDATION_ERROR', result: errors });
  }
  const customerId = req.customerId;
  const userId = parseInt(req.params.userId, 10);
  const prefix = req.administrator.customer.prefix;
  const index = prefix === 'el' || prefix === 'sc' ? 'profile' : `profile_${prefix}`;

  // ig el or sc index = profile else index  = profile_${prefix}
  try {
    await userService.killHim({ customerId, prefix, userId });
    const elasticSearchHostConfigs = config.get('elasticSearchConfigs');
    const elasticSearchHost = elasticSearchHostConfigs[prefix];
    if (elasticSearchHost) {
      const client = new Client({ node: elasticSearchHost });
      await client.delete({
        id: userId,
        index,
      });
    }

    res.json({ err: false, result: { deleted: true } });
  } catch (e) {
    logger.error(e);
    res.json({ err: true, err_msg: 'SERVER_ERROR' });
  }
});

router.get('/:userId', async (req, res) => {
  req.checkParams({
    userId: {
      notEmpty: true,
      isNumber: true
    }
  });
  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: 'VALIDATION_ERROR', result: errors });
  }
  const customerId = req.customerId;
  const userId = parseInt(req.params.userId, 10);
  const prefix = req.administrator.customer.prefix;
  // const billingConf = config.get(`billing.${prefix}`);

  logger.info([prefix, userId, customerId]);

  try {
    const sqlResult = await sqlDB.query('sql/users/user.sql', [prefix, userId, customerId]);
    const user = sqlResult.rows[0];
    logger.info(user);

    async.parallel({
      userContacts(callback) {
        try {
          sqlDB.query('sql/users/get-user-contact.sql', [customerId, userId])
              .then((sqlResult) => {
                if (sqlResult.rowCount === 0) {
                  return callback(null, {
                    contactsCount: 0
                  });
                }
                const userContactsResult = sqlResult.rows[0];
                if (userContactsResult) {
                  const userContactsBuffer = userContactsResult.user_contacts;

                  zlib.unzip(userContactsBuffer, (err, buffer) => {
                    if (err) {
                      logger.error(err);
                      return callback('UNZIP_ERROR');
                    }
                    const userContactsFile = buffer.toString('utf8');
                    const userContacts = userContactsFile.split(',');
                    callback(null, {
                      contactsCount: userContacts.length,
                      userContacts
                    });
                  });
                }
              });
        } catch (e) {
          logger.error(e);
          return callback(e, null);
        }
      },
      // userBillingTransactions(callback) {
      //   return callback(null, []);
      //
      //   const requestUrl = `${billingConf.host}/jbilling/rest/analytics/payment/getUserPayments`;
      //
      //   const queryString = {
      //     username: `${prefix}${user.username}`
      //   };
      //   request.get(requestUrl, {
      //     qs: queryString
      //   }, (err, httpResponse, result) => {
      //     if (err || result.err) {
      //       global.log.error(err);
      //       // return callback(err, null);
      //     }
      //     let transactions;
      //     try {
      //       transactions = JSON.parse(result);
      //     } catch (e) {
      //       global.log.error(e);
      //       global.log.error(result);
      //       // return callback(e, null);
      //     }
      //     return callback(null, transactions || []);
      //   });
      // },
      userSubscription(callback) {
        const billingConf = config.get(`billing.${helpers.getConfigKey(prefix)}`);
        const requestUrl = `${billingConf.host}/jbilling/rest/json/subscriptionDetails`;
        const queryString = {
          username: `${prefix}${user.username}`,
        };

        request.get(requestUrl, {
          qs: queryString
        }, (err, httpResponse, result) => {
          try {
            if (err || result.err) {
              global.log.error(err);
              return callback(err, null);
            }
            const subscriptions = JSON.parse(result);
            return callback(null, subscriptions.result);
          } catch (e) {
            return callback(null, null);
          }


        });
      },
      userVerification(callback) {
        redisService.getCache().hget('verify_code', `${prefix}${user.username}`, (err, verification) => {
          if (err) {
            logger.error(err);
            return callback(err, null);
          }
          callback(null, JSON.parse(verification));
        });
      }
    }, (err, result) => {
      if (err) {
        return res.json({ err: true, err_msg: 'FETCH_ERROR', result: err }).send();
      }


      const contactsCount = result.userContacts;
      const transactions = [];
      user.verification = result.userVerification;
      const subscription = result.userSubscription;

      if (subscription !== null) {
        user.subscriptionType = subscription.type;
        user.subscriptionStartDate = subscription.startDate;
        user.subscriptionEndDate = subscription.endDate;
      }

      // "startDate":"2020-12-17 09:31:36.0","username":"sc871974149891","endDate":"2021-01-17 11:25:22.0","type":"SUBSCRIPTION_PURCHASED"
      return res.json({ err: false,
        result: { ...user, ...contactsCount, transactions }
      });
    });
  } catch (e) {
    logger.error(e);
    return res.json({ err: true, err_msg: 'DB_ERROR', result: e }).send();
  }
});


/**
 * URL: /v1/users/:phoneNumber/lock
 * METHOD: POST
 * Description: Create user DID Number
 */

router.post('/:number/did-numbers', async (req, res) => {
  req.checkParams({
    number: {
      notEmpty: true,
      isNumber: true
    }
  });
  req.checkBody({
    didNumber: {
      notEmpty: true,
      isNumber: true
    }
  });
  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: 'VALIDATION_ERROR', result: errors });
  }

  const number = req.params.number;
  const didNumber = req.body.didNumber;
  const prefix = req.administrator.customer.prefix;
  const username = prefix + number;

  try {
    const result = await userService
        .didNumbers
        .update({ username, didNumber, prefix });
    res.json({ err: false, result });
  } catch (e) {
    res.json({ err: true, err_msg: 'BILLING_SERVICE_ERROR' });
  }
});


/**
 * URL: /v1/users/:phoneNumber/did-numbers
 * METHOD: DELETE
 * Description: DELETE  User DID Number
 */

router.delete('/:number/did-numbers', async (req, res) => {
  req.checkParams({
    number: {
      notEmpty: true,
      isNumber: true
    }
  });
  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: 'VALIDATION_ERROR', result: errors });
  }
  const number = req.params.number;
  const prefix = req.administrator.customer.prefix;
  const username = prefix + number;

  try {
    const result = await userService.didNumbers.delete({ username, prefix });
    res.json({ err: false, result });
  } catch (e) {
    res.json({ err: true, err_msg: 'BILLING_SERVICE_ERROR' });
  }
});

/**
 * URL: /v1/users/:phoneNumber/did-numbers
 * METHOD: GET
 * Description: GET user DID Number
 */

router.get('/:number/did-numbers', async (req, res) => {
  req.checkParams({
    number: {
      notEmpty: true,
      isNumber: true
    }
  });
  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: 'VALIDATION_ERROR', result: errors });
  }

  const number = req.params.number;
  const prefix = req.administrator.customer.prefix;
  const username = prefix + number;

  try {
    const result = await userService.didNumbers.get({ username, prefix });
    res.json({ err: false, result });
  } catch (e) {
    res.json({ err: true, err_msg: 'BILLING_SERVICE_ERROR' });
  }
});


module.exports = router;
