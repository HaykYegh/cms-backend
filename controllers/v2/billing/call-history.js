const express = require('express');
const config = require('config');
const async = require('async');
const request = require('request');
const utils = require('../../../helpers/utils');
const helpers = require('../../../helpers');

const router = express.Router();


/*
 * URL: /v2/billing/call-history
 * METHOD: GET
 * Description: Get call history
 */
router.get('/', (req, res) => {
  req.checkQuery({
    offset: {
      notEmpty: true,
      isNumber: true
    },
    startDate: {
      notEmpty: true,
      isDate: true
    },
    endDate: {
      notEmpty: true,
      isDate: true
    },
    virtualNetwork: {
      optional: true
    },
    fromCountry: {
      optional: true
    },
    toCountry: {
      optional: true
    },
    currency: {
      optional: true
    },
    limit: {
      optional: true,
      isNumber: true,
    },
    callType: {
      optional: true
    },
    username: {
      optional: true,
      isString: true
    },
    statusCode: {
      optional: true,
      isString: true
    },
  });

  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: errors });
  }

  const prefix = req.administrator.customer.prefix;
  const billingConf = config.get(`billing.${helpers.getConfigKey(prefix)}`);

  const offset = req.query.offset;
  const virtualNetwork = req.network.name || '';


  const startDate = utils.getStartDateInt(req.query.startDate);
  const endDate = utils.getEndDateInt(req.query.endDate);
  const fromCountry = req.query.fromCountry || '';
  const toCountry = req.query.toCountry || '';
  const currency = req.query.currency || 'USD';
  const limit = req.query.limit || 50;
  const callType = req.query.callType || 'OUTGOING';
  const username = req.query.username ? (prefix + req.query.username) : '';
  const statusCode = req.query.statusCode || '';


  async.parallel({
    getCalls(callback) {
      const requestUrl = `${billingConf.host}/jbilling/rest/analytics/call/getCalls`;
      const queryString = {
        prefix,
        startDate,
        endDate,
        reseller: virtualNetwork,
        fromCountry,
        toCountry,
        start: offset,
        limit,
        callType,
        currency,
        username,
        causeCode: statusCode
      };
      request.get(requestUrl, {
        qs: queryString
      }, (err, httpResponse, result) => {
        console.log(result)
        if (err || result.err) {
          global.log.error(err);
          return callback(err, null);
        }
        let callHistory;
        try {
          callHistory = JSON.parse(result);
        } catch (e) {
          global.log.error(e);
          global.log.error(result);
          return callback('BILLING_SERVICE_ERROR', null);
        }

        // console.log(callHistory);
        // console.log(result);

        callback(null, callHistory);
      });
    },
    numbersOf(callback) {
      const requestUrl = `${billingConf.host}/jbilling/rest/analytics/call/getCallsAmount`;
      const queryString = {
        prefix,
        startDate,
        endDate,
        reseller: virtualNetwork,
        fromCountry,
        toCountry,
        callType,
        currency,
        username,
        causeCode: statusCode
      };
      request.get(requestUrl, {
        qs: queryString
      }, (err, httpResponse, result) => {
        if (err || result.err) {
          global.log.error(err);
          return callback(err, null);
        }
        let numberOf;
        try {
          numberOf = JSON.parse(result);
        } catch (e) {
          global.log.error(e);
          global.log.error(result);
          return callback('BILLING_SERVICE_ERROR', null);
        }
        callback(null, numberOf.result);
      });
    }
  }, (err, results) => {
    if (err) {
      global.log.error(err);
      return res.json({ err: true, err_msg: 'BILLING_SERVICE_ERROR', result: err });
    }
    return res.json({ err: false, result: results });
  });
});

module.exports = router;
