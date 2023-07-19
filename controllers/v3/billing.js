const express = require('express');
const config = require('config');
const request = require('request');
const utils = require('../../helpers/utils');
const helpers = require('../../helpers');
const logger = require('../../services/logger');
const customerService = require('../../services/customers');

const router = express.Router();


/*
 * URL: /v3/billing/stats
 * METHOD: GET
 * Description: Get top up transactions
 */
router.get('/stats', (req, res) => {
  req.checkQuery({
    startDate: {
      notEmpty: true,
      isDate: true
    },
    endDate: {
      notEmpty: true,
      isDate: true
    },
    network: {
      optional: true
    },
    regionCode: {
      optional: true
    },
    currency: {
      optional: true,
      isString: true,
    },
    username: {
      optional: true,
      isString: true,
    }
  });

  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: errors });
  }
  const prefix = req.administrator.customer.prefix;
  const { currency } = customerService.customers.getValue(prefix);
  const billingConf = config.get(`billing.${helpers.getConfigKey(prefix)}`);


  // http://127.0.0.1:8080/jbilling/rest/analytics/payment/getPaymentsStatistics?prefix=ba&startDate=0&endDate=1577452881323&reseller=-1&paymentMethod=ALL&currency=AMD

  const requestUrl = `${billingConf.host}/jbilling/rest/analytics/payment/getPaymentsStatistics`;

  const startDate = utils.getStartDateInt(req.query.startDate);
  const endDate = utils.getEndDateInt(req.query.endDate);
  const username = req.query.username ? (prefix + req.query.username) : '';
  const userGroupId = req.query.userGroupId;
  const network = req.query.network;


  let reseller = '';

  if (network) {
    reseller = network;
  } else if (userGroupId) {
    reseller = userGroupId;
  }


  const queryString = {
    prefix,
    startDate,
    endDate,
    reseller,
    paymentMethod: 'ALL',
    currency,
    username,
  };
  logger.info(queryString);
  request.get(requestUrl, {
    qs: queryString
  }, (err, httpResponse, result) => {
    if (err) {
      global.log.error(err);
      return res.json({ err: true, err_msg: 'BILLING_SERVICE_NETWORK_ERROR' });
    }

    let records;
    try {
      records = JSON.parse(result);
    } catch (e) {
      global.log.error(e);
      global.log.error(result);
      return res.json({ err: true, err_msg: 'BILLING_SERVICE_ERROR', result });
    }

    return res.json({ err: false, result: records.result });
  });
});


module.exports = router;
