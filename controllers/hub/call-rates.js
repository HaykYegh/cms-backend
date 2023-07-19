const express = require('express');
const async = require('async');
const config = require('config');
const redisService = require('../../services/redis');
const callService = require('../../services/call');
const request = require('request');
const helpers = require('../../helpers');

const router = express.Router();


/**
 * URL: /hub/call-rates
 * METHOD: POST
 * Description: Update rates from billing
 * */

router.post('/', (req, res) => {
  req.checkHeaders({
    virtualNetwork: {
      optional: true,
    }
  });
  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ error: true, errorMessage: errors }).send();
  }

  const prefix = req.user.prefix;
  const billingConf = config.get(`billing.${helpers.getConfigKey(prefix)}`);

  const getCurrencies = () => new Promise((resolve, reject) => {
    const requestURL = `${billingConf.host}/jbilling/rest/json/getCurrencies`;
    request.get(requestURL, {
      headers: {
        'Content-Type': 'application/json'
      }
    }, (err, httpResponse, result) => {
      if (err || result.err) {
        global.log.error(err);
        return reject('CURRENCY_REQUEST_ERROR');
      }
      let currencyResponse = [];
      try {
        currencyResponse = JSON.parse(result);
      } catch (err) {
        console.error(err);

        return reject('CURRENCY_PARSE_ERROR');
      }
      const currencies = {};
      // eslint-disable-next-line array-callback-return
      currencyResponse.map((currency) => {
        currencies[currency.code] = JSON.stringify(currency);
      });
      redisService.getCache().hmset(redisService.CONSTANTS.HASH.CURRENCIES, currencies, (err) => {
        if (err) {
          global.log.error(err);
          return reject('CURRENCY_INVALID_INSERT_IN_CACHE');
        }
        resolve('SUCCESSFULLY_FLUSHED_CURRENCIES');
      });
    });
  });
  const getPriceList = ({ prefix, virtualNetwork }) => new Promise((resolve, reject) => {
    const requestURL = `${billingConf.host}/jbilling/rest/json/getPrices`;
    request.get(requestURL, {
      qs: {
        prefix,
        type: 'MAIN',
        reseller: virtualNetwork
      }
    }, (err, httpResponse, result) => {
      let priceListResponse = [];
      try {
        priceListResponse = JSON.parse(result);
      } catch (err) {
        console.error(err);
        return reject('UNABLE_PARSE_JSON');
      }
      const priceList = {};
      // eslint-disable-next-line array-callback-return
      priceListResponse.map((priceItem) => {
        priceList[priceItem.code] = JSON.stringify(priceItem);
      });
      if (err || result.err) {
        global.log.error(err);
        return reject('PRICE_LIST_REQUEST_ERROR');
      }
      const hash = `${redisService.CONSTANTS.HASH.CALL_PRICES}#${prefix}`;
      redisService.getCache().hmset(hash, priceList, (err) => {
        if (err) {
          global.log.error(err);
          return reject('PRICE_LIST_INVALID_INSERT_IN_CACHE');
        }
        resolve('SUCCESSFULLY_FLUSHED_CALL_PRICES');
      });
    });
  });
  const virtualNetwork = req.headers.virtualNetwork || '';
  Promise.all([
    getCurrencies(),
    getPriceList({ prefix, virtualNetwork }),
  ])
    .then(result => res
      .status(200)
      .json({
        error: false,
        result: result.length === 2
      })
      .send())
    .catch(err => res
      .json({ error: true, errorMessage: err })
      .send());
});

/**
 * URL: /hub/call-rates/:currency
 * METHOD: GET
 * Description: Get rate by currency in all country
 * */

router.get('/:currency', (req, res) => {
  req.checkParams({
    currency: {
      notEmpty: true
    },
  });
  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ error: true, errorMessage: errors }).send();
  }
  const currency = req.params.currency.toUpperCase();
  const prefix = req.user.prefix;
  async.parallel({
    country(callback) {
      redisService.getCache().hgetall(`${redisService.CONSTANTS.HASH.CALL_PRICES}#${prefix}`, (err, cache) => {
        if (err) {
          return callback(err || true, null);
        } else if (cache) {
          return callback(null, cache);
        }
      });
    },
    exchange: callService.getExchange(prefix, currency)
  }, (err, results) => {
    if (err) {
      return res.json({ error: true, errorMessage: err }).send();
    }

    // eslint-disable-next-line array-callback-return
    const countries = Object.keys(results.country).map((countryCode) => {
      const country = JSON.parse(results.country[countryCode]);
      // eslint-disable-next-line radix
      const phoneCode = parseInt(country.phoneCode);
      if (country.description && !isNaN(phoneCode)) {
        const getPrices = (prices) => {
          const mobile = [];
          const lendline = [];
          // eslint-disable-next-line array-callback-return
          prices.map((priceItem) => {
            if (priceItem.destination.toLowerCase().includes('mobile')) {
              mobile.push(priceItem.price);
            } else {
              lendline.push(priceItem.price);
            }
          });
          return {
            mobile: mobile.length === 0 ? [0] : mobile,
            lendline: lendline.length === 0 ? [0] : lendline,
          };
        };
        const prices = getPrices(country.prices);
        const lendline = Math.min(...prices.lendline) * currency.rate || 0;
        const mobile = Math.min(...prices.mobile) * currency.rate || lendline;
        return {
          lendline,
          mobile,
          description: country.description,
          phoneCode,
          countryCode: country.code
        };
      }
    }).filter(country => country);


    let topCountries;

    try {
      topCountries = config.get(`voip.top-countries.${helpers.getConfigKey(prefix)}`);
    } catch (e) {
      global.log.error(err);
      topCountries = [
        'India',
        'Russia',
        'United States'
      ];
    }

    return res.status(200).json({
      error: false,
      result: {
        countries,
        code: currency.code,
        rate: !results.exchange ? parseFloat(currency.rate) : results.exchange,
        top: topCountries,
      }
    }).send();
  });
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

router.get('/:currency/:countryCode', (req, res) => {
  req.checkParams({
    currency: {
      notEmpty: true
    },
    countryCode: {
      notEmpty: true
    },
  });
  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ error: true, errorMessage: errors }).send();
  }

  const currency = req.params.currency.toUpperCase();
  const countryCode = req.params.countryCode.toUpperCase();
  const prefix = req.user.prefix;

  async.parallel({
    country(callback) {
      redisService.getCache().hget(`${redisService.CONSTANTS.HASH.CALL_PRICES}#${prefix}`, countryCode, (err, cache) => {
        if (err) {
          return callback(err || true, null);
        } else if (cache) {
          return callback(null, cache);
        }
        return callback('INVALID_COUNTRY_PARAMETER', null);
      });
    },
    exchange: callService.getExchange(prefix, currency)
  }, (err, results) => {
    if (err) {
      return res.json({ error: true, errorMessage: err }).send();
    }
    const country = JSON.parse(results.country);
    return res.status(200).json({
      error: false,
      result: {
        price: country.prices,
        code: currency,
        rate: results.exchange || 0.00,
        description: country.description,
        countryCode
      }
    }).send();
  });
});


module.exports = router;
