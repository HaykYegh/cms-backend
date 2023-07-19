const express = require('express');
const async = require('async');
const config = require('config');
const redisService = require('../../../services/redis');
const logger = require('../../../services/logger');
const callService = require('../../../services/call');
const request = require('request');
const helpers = require('../../../helpers');

const router = express.Router();

/**
 * URL: /hub/call-rates/:currency
 * METHOD: GET
 * Description: Get rate by currency in all country
 * */

router.get('/:currency', async (req, res) => {
  req.checkParams({
    currency: {
      notEmpty: true,
      isString: true
    }
  });
  const errors = req.validationErrors(true);

  if (errors) {
    return res.json({ error: true, errorMessage: 'VALIDATION_ERROR', result: errors });
  }
  const currencyCode = req.params.currency.toUpperCase();
  const prefix = req.user.prefix;


  const countriesPromise = redisService
    .commands
    .hgetall(`${redisService.CONSTANTS.HASH.CALL_PRICES}#${prefix}`);
  const exchangePromise = callService
    .getCurrentRate({ prefix, currency: currencyCode });

  try {
    const [
      countryResult,
      exchangeResult
    ] = await Promise.all([
      countriesPromise,
      exchangePromise
    ]);
    const rate = exchangeResult;
    const countries = Object.keys(countryResult)
      .map((regionCode) => {
        const country = JSON.parse(countryResult[regionCode]);
        if (!country || !country.code || !country.phoneCode) {
          return -1;
        }
        return {
          landLine: country.landline ? country.landline * rate : 0,
          mobile: country.mobile ? country.mobile * rate : 0,
          description: country.description || '',
          phoneCode: country.phoneCode,
          countryCode: country.code
        };
      }).filter(country => country !== -1);


    let topCountries;

    try {
      topCountries = config.get(`voip.top-countries.${helpers.getConfigKey(prefix)}`);
    } catch (e) {
      logger.error(e);
      topCountries = [
        'India',
        'Russia',
        'United States'
      ];
    }

    return res.json({ error: false,
      result: {
        countries,
        code: currencyCode,
        rate,
        top: topCountries,
      }
    });
  } catch (e) {
    logger.error(e);
    res.json({ error: true, errorMessage: e.message });
  }
});


/**
 * URL: /hub/call-rates/:username/rates
 * METHOD: GET
 * Description: Get rate by username
 * */

router.get('/:number/rates', (req, res) => {
  req.checkParams({
    number: {
      notEmpty: true,
      isNumber: true
    }
  });
  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ error: true, errorMessage: errors }).send();
  }

  const customerId = req.user.customerId;
  const prefix = req.user.prefix;
  const billingConf = config.get(`billing.${helpers.getConfigKey(prefix)}`);
  const number = prefix + req.params.number;
  const username = req.user.username;
  const from = req.user.username.replace(prefix, '');

  const sql = {
    params: [prefix, customerId, number]
  };

  global.sql.first('hub-get-user-roaming-number', sql.params, (err, result) => {
    if (err) {
      global.log.error(err);
      return res.status(200).json({ err: true, err_msg: 'NOT_FOUND' }).send();
    }
    const roamingNumber = result ? result.number : req.params.number;
    async.parallel({
      getCallBack(callback) {
        const requestUrl = `${billingConf.host}/jbilling/rest/json/validatePurchaseC2`;
        const callType = 'cb_000';
        const queryString = {
          username,
          from,
          fields: `src:1:string:${from},dst:2:string:${roamingNumber},duration:3:string:1,calltype:4:string:${callType}`,
          promo: 0
        };
        request.get(requestUrl, {
          qs: queryString
        }, (err, httpResponse, result) => {
          if (err || result.err) {
            global.log.error(err);
            return callback(err, null);
          }
          callback(null, JSON.parse(result));
        });
      },
      getCallOut(callback) {
        const requestUrl = `${billingConf.host}/jbilling/rest/json/validatePurchaseC2`;
        const callType = '000';

        const queryString = {
          username,
          from,
          fields: `src:1:string:${from},dst:2:string:${roamingNumber},duration:3:string:1,calltype:4:string:${callType}`,
          promo: 0
        };
        request.get(requestUrl, {
          qs: queryString
        }, (err, httpResponse, result) => {
          if (err || result.err) {
            global.log.error(err);
            return callback(err, null);
          }
          callback(null, JSON.parse(result));
        });
      }
    }, (err, results) => {
      if (err) {
        return res.json({ error: true, errorMessage: err }).send();
      }

      const { getCallOut, getCallBack } = results;
      const currencyCode = getCallOut.currencyCode;
      const phoneCode = getCallOut.phoneCode;
      const countryName = getCallOut.countryName;

      // eslint-disable-next-line no-restricted-syntax
      for (const property of ['currencyCode', 'phoneCode', 'countryName']) {
        delete getCallOut[property];
        delete getCallBack[property];
      }

      return res.status(200)
        .json({
          error: false,
          result: {
            currencyCode,
            outCall: getCallOut,
            callBack: getCallBack,
            phoneCode,
            countryName
          }
        })
        .send();
    });
  });
});


/**
 * URL: /hub/call-rates/:currency/:countryCode
 * METHOD: GET
 * Description: Get rate by currency in all country
 * */

router.get('/:currency/:countryCode', async (req, res) => {
  req.checkParams({
    currency: {
      notEmpty: true,
      isString: true
    },
    countryCode: {
      notEmpty: true,
      isString: true
    },
  });
  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ error: true, errorMessage: 'VALIDATION_ERROR', result: errors });
  }
  const currencyCode = req.params.currency.toUpperCase();
  const countryCode = req.params.countryCode.toUpperCase();
  const prefix = req.user.prefix;


  const countriesPromise = redisService
    .commands
    .hget(`${redisService.CONSTANTS.HASH.CALL_PRICES}#${prefix}`, countryCode);
  const exchangePromise = callService
    .getCurrentRate({ prefix, currency: currencyCode });

  try {
    const [
      countryResult,
      exchangeResult
    ] = await Promise.all([
      countriesPromise,
      exchangePromise
    ]);
    const rate = exchangeResult;
    const country = JSON.parse(countryResult);

    return res.json({
      error: false,
      result: {
        price: country.prices,
        code: currencyCode,
        rate,
        description: country.description || "",
        countryCode
      }
    });
  } catch (e) {
    logger.error(e);
    res.json({ error: true, errorMessage: e.message });
  }
});


module.exports = router;
