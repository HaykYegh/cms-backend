const express = require('express');
const redisService = require('../../services/redis');

const router = express.Router();


/**
 * URL: /v1/attempts
 * METHOD: GET
 * Description: GET user sign in attempts
 */

router.get('/', (req, res) => {
  req.checkQuery({
    offset: {
      notEmpty: true
    },
    username: {
      optional: true
    }
  });

  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: false, err_msg: errors }).send();
  }

  const limit = 50;
  const offset = req.query.offset * limit;
  const prefix = req.administrator.customer.prefix;

  const sql = {
    params: [prefix, limit, offset, req.customerId],
    query: 'attempts'
  };

  if (req.query.username) {
    const username = prefix + req.query.username;
    sql.query = 'user-attempts';
    sql.params.push(username);
  }

  global.sql.run(sql.query, sql.params, (err, devices) => {
    if (err) {
      global.log.error(err);
      const error = {
        err: true,
        err_msg: 'unable select attempts',
      };
      return res.status(500).json(error).send();
    }

    return res.status(200).json({ err: false, result: devices }).send();
  });
});


/**
 * URL: /v1/attempts/:username
 * METHOD: GET
 * Description: GET user attempts
 */

router.get('/:username', (req, res) => {
  req.checkQuery({
    offset: {
      notEmpty: true
    }
  });
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
  const limit = 50;
  const offset = parseInt(req.query.offset, 10) * limit;


  const getUserAttemptsData = (prefix, username, limit, offset, customerId) =>
    new Promise((resolve, reject) => {
      global.sql.run('get-username-attempts',
        [
          prefix,
          username,
          limit,
          offset,
          customerId
        ], (err, attempts) => {
          if (err) {
            reject({ err: true, err_msg: err });
          }
          resolve(attempts);
        });
    });
  const getUserCache = username => new Promise((resolve, reject) => {
    redisService.getCache().hget('verify_code', username, (err, verification) => {
      if (err) {
        reject({ err: true, err_msg: err });
      }
      resolve(JSON.parse(verification));
    });
  });
  Promise
    .all([
      getUserAttemptsData(prefix, username, limit, offset, req.customerId),
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
 * URL: /v1/attempts/:username
 * METHOD: DELETE
 * Description: GET user attempts
 */

router.delete('/:username', (req, res) => {
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

  global.sql.run('reset-username-attempts', [username, req.customerId], (err, attempts, query) => {
    if (err) {
      global.log.error(err);
      const error = {
        err: true,
        err_msg: 'unable reset attempts',
      };
      return res.status(200).json(error).send();
    }
    if (query.rowCount > 0) {
      return res.status(200).json({ err: false, result: query.rows }).send();
    }
    return res.status(200).json({ err: false, result: query.rows }).send();
  });
});


module.exports = router;
