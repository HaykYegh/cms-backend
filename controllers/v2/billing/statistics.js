const express = require('express');
const config = require('config');
const request = require('request');
const utils = require('../../../helpers/utils');
const helpers = require('../../../helpers');

const router = express.Router();

/*
 * URL: /v2/billing/statistics
 * METHOD: GET
 * Description: Get payment statistics
*/
router.get('/', async (req, res) => {
  req.checkQuery({
    startDate: {
      notEmpty: true,
      isDate: true
    },
    endDate: {
      notEmpty: true,
      isDate: true
    },
    userGroupId: {
      optional: true,
      isString: true
    },
    paymentMethod: {
      optional: true,
      isString: true
    },
    username: {
      optional: true,
      isString: true
    }
  });
  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: errors });
  }

  const prefix = req.admin.customer.prefix;
  const currency = req.admin.customer.currency;
  const startDate = utils.getStartDateInt(req.query.startDate);
  const endDate = utils.getEndDateInt(req.query.endDate);
  const reseller = req.query.userGroupId && req.query.userGroupId !== -1 ?
    req.query.userGroupId : null;
  const paymentMethod = req.query.paymentMethod || 'ALL';
  const username = req.query.username;

  const billingConf = config.get(`billing.${helpers.getConfigKey(prefix)}`);
  // This API only works for esim and brilliant.
  const requestUrl = `${billingConf.host}/jbilling/rest/analytics/payment/getPaymentsStatistics`;
  const queryString = {
    prefix,
    startDate,
    endDate,
    reseller,
    paymentMethod,
    currency,
    username
  };

  request.get(requestUrl, { qs: queryString }, (err, httpResponse, result) => {
    if (err || result.err) {
      global.log.error(err);
      return res.json({ err: true, err_msg: 'BILLING_SERVICE_ERROR', result: err }).send();
    }

    let statistics;
    try {
      statistics = JSON.parse(result);
    } catch (e) {
      global.log.error(e);
      global.log.error(result);
      return res.json({ err: true, err_msg: 'BILLING_SERVICE_ERROR', result: err }).send();
    }

    res.json({ err: false, result: statistics.result });
  });
});

module.exports = router;
