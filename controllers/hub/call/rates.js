const express = require('express');
const config = require('config');
const request = require('request');
const redis = require('redis').createClient(config.get('redis'));
const redisHelper = require('../../../services/redis');
const helpers = require('../../../helpers');

const router = express.Router();


/**
 * URL: /hub/call/rates
 * METHOD: POST
 * Description: Update rates from billing
 * */

router.post('/', (req, res) => {
  req.checkHeaders({
    resource: {
      isResourceToken: true,
    },
    prefix: {
      notEmpty: true,
    },
    virtualNetwork: {
      optional: true,
    }
  });
  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: errors }).send();
  }
  const getCurrencies = () => new Promise((resolve, reject) => {
    const requestURL = `${config.get('billing.host')}/jbilling/rest/json/getCurrencies`;
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
      redis.hmset(redisHelper.CONSTANTS.HASH.CURRENCIES, currencies, (err) => {
        if (err) {
          global.log.error(err);
          return reject('CURRENCY_INVALID_INSERT_IN_CACHE');
        }
        resolve('SUCCESSFULLY_FLUSHED_CURRENCIES');
      });
    });
  });
  const getPriceList = ({ prefix, virtualNetwork }) => new Promise((resolve, reject) => {
    const requestURL = `${config.get('billing.host')}/jbilling/rest/json/getPrices`;
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
      const hash = `${redisHelper.CONSTANTS.HASH.CALL_PRICES}#${prefix}`;
      redis.hmset(hash, priceList, (err) => {
        if (err) {
          global.log.error(err);
          return reject('PRICE_LIST_INVALID_INSERT_IN_CACHE');
        }
        resolve('SUCCESSFULLY_FLUSHED_CALL_PRICES');
      });
    });
  });
  const prefix = req.headers.prefix;
  const virtualNetwork = req.headers.virtualNetwork || '';
  Promise.all([
    getCurrencies(),
    getPriceList({ prefix, virtualNetwork }),
  ])
    .then(result => res
      .status(200)
      .json({
        err: false,
        result: result.length === 2
      })
      .send())
    .catch(err => res
      .json({ err: true, err_msg: err })
      .send());
});

/**
 * URL: /hub/call/rates/:currency
 * METHOD: GET
 * Description: Get rate by currency in all country
 * */

router.get('/:currency', (req, res) => {
  req.checkHeaders({
    resource: {
      isResourceToken: true
    },
    prefix: {
      notEmpty: true,
    },
  });
  req.checkParams({
    currency: {
      notEmpty: true
    },
  });
  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: errors }).send();
  }
  const currency = req.params.currency.toUpperCase();
  const prefix = req.headers.prefix;
  global.async.parallel({
    country(callback) {
      redis.hgetall(`${redisHelper.CONSTANTS.HASH.CALL_PRICES}#${prefix}`, (err, cache) => {
        if (err) {
          return callback(err || true, null);
        } else if (cache) {
          return callback(null, cache);
        }
      });
    },
    currency(callback) {
      redis.hget(redisHelper.CONSTANTS.HASH.CURRENCIES, currency, (err, cache) => {
        if (err) {
          return callback(err || true, null);
        } else if (cache) {
          return callback(null, cache);
        }
      });
    }
  }, (err, results) => {
    if (err) {
      return res.json({ err: true, err_msg: err }).send();
    }
    const currency = JSON.parse(results.currency);
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
        const lendline = Math.min(...prices.lendline) * currency.rate;
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
      err: false,
      result: {
        countries,
        code: currency.code,
        rate: parseFloat(currency.rate),
        top: topCountries,
      }
    }).send();
  });
});


/**
 * URL: /hub/call/rates/:currency/:countryCode
 * METHOD: GET
 * Description: Get rate by currency in all country
 * */

router.get('/:currency/:countryCode', (req, res) => {
  req.checkHeaders({
    resource: {
      isResourceToken: true
    },
    prefix: {
      notEmpty: true,
    },
  });
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
    return res.json({ err: true, err_msg: errors }).send();
  }
  const currency = req.params.currency.toUpperCase();
  const countryCode = req.params.countryCode.toUpperCase();
  const prefix = req.headers.prefix;
  global.async.parallel({
    country(callback) {
      redis.hget(`${redisHelper.CONSTANTS.HASH.CALL_PRICES}#${prefix}`, countryCode, (err, cache) => {
        if (err) {
          return callback(err || true, null);
        } else if (cache) {
          return callback(null, cache);
        }
      });
    },
    currency(callback) {
      redis.hget(redisHelper.CONSTANTS.HASH.CURRENCIES, currency, (err, cache) => {
        if (err) {
          return callback(err || true, null);
        } else if (cache) {
          return callback(null, cache);
        }
      });
    }
  }, (err, results) => {
    if (err) {
      return res.json({ err: true, err_msg: err }).send();
    }
    const currency = JSON.parse(results.currency);
    const country = JSON.parse(results.country);

    return res.status(200).json({
      err: false,
      result: {
        price: country.prices,
        code: currency.code,
        rate: parseFloat(currency.rate),
        description: country.description,
        countryCode
      }
    }).send();
  });
});


module.exports = router;
