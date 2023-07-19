const express = require('express');
const CONSTANTS = require('../../helpers/constants');
const redisService = require('../../services/redis');

const router = express.Router();


/**
 * URL: /v1/misc/countries
 * METHOD: GET
 * Description: Get countries
 */

router.get('/countries', (req, res) => {
  global.sql.run('get-countries', (err, result) => {
    if (err) {
      return res.status(200).json({ err: true, result: 'DATABASE_ERROR' }).send();
    }
    return res.status(200).json({ err: false, result }).send();
  });
});


/**
 * URL: /v1/misc/languages
 * METHOD: GET
 * Description: GET languages
 */

router.get('/languages', (req, res) => {
  global.sql.run('languages-get-all', [], (err, languages) => {
    if (err) {
      global.log.error(err);
      const error = {
        err: true,
        err_msg: 'unable select languages',
      };
      return res.status(200).json(error).send();
    }

    return res.status(200).json({ err: false, result: languages }).send();
  });
});


/**
 * URL: /v1/misc/platforms
 * METHOD: GET
 * Description: GET platforms
 */

router.get('/platforms', (req, res) => {
  global.sql.run('attr-platforms', [], (err, platforms) => {
    if (err) {
      global.log.error(err);
      const error = {
        err: true,
        err_msg: 'unable select platforms',
      };
      return res.status(500).json(error).send();
    }
    return res.status(200).json({ err: false, result: platforms }).send();
  });
});


/**
 * URL: /v1/misc/payment-methods
 * METHOD: GET
 * Description: GET payment methods
 */

router.get('/payment-methods', (req, res) => {
  const PAYMENT_METHODS = CONSTANTS.BILLING.METHODS;
  const PAYMENT_METHODS_MAP = [];

  global._.forEach(PAYMENT_METHODS, (value, key) => {
    PAYMENT_METHODS_MAP.push({
      value: PAYMENT_METHODS[key],
      label: key,
    });
  });

  return res.status(200).json({ err: false, result: PAYMENT_METHODS_MAP }).send();
});


/**
 * URL: /v1/misc/customer-packages
 * METHOD: GET
 * Description: GET customer packages
 */

router.get('/customer-packages', (req, res) => {
  global.sql.run('attr-customer-packages', [], (err, customerPackages) => {
    if (err) {
      global.log.error(err);
      const error = {
        err: true,
        err_msg: 'unable select customer packages',
      };
      return res.status(500).json(error).send();
    }
    return res.status(200).json({ err: false, result: customerPackages }).send();
  });
});

module.exports = router;
