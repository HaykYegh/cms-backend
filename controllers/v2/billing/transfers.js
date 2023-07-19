const express = require('express');
const config = require('config');
const request = require('request');

const router = express.Router();
const billingConf = config.get('billing');


/*
 * URL: /v2/billing/transfers
 * METHOD: GET
 * Description: Get top up transfers
 */
router.get('/transfers', (req, res) => {
  req.checkQuery({
    offset: {
      notEmpty: true,
      isNumber: true
    },
    startDate: {
      notEmpty: true
    },
    endDate: {
      notEmpty: true
    },
    virtualNetwork: {
      optional: true
    },
    regionCode: {
      optional: true
    },
  });

  const errors = req.validationErrors(true);
  if (errors) {
    return res.status(200).json({ err: true, err_msg: errors }).send();
  }


  const requestUrl = `${billingConf.host}/jbilling/rest/analytics/payment/getTransfers`;
  const prefix = req.administrator.customer.prefix;

  const offset = req.query.offset;
  const startDate = new Date(req.query.startDate).getTime();
  const endDate = new Date(req.query.endDate).getTime();
  const virtualNetwork = req.query.virtualNetwork;
  const regionCode = req.query.regionCode;


  const queryString = {
    prefix,
    startDate,
    endDate,
    reseller: virtualNetwork || '',
    paymentMethod: 'ALL',
    country: regionCode || '',
    start: offset,
    limit: 50
  };

  request.get(requestUrl, {
    qs: queryString
  }, (err, httpResponse, result) => {
    if (err || result.err) {
      global.log.error(err);
      return res.json({ err: true, err_msg: 'BILLING_SERVICE_ERROR', result: err }).send();
    }
    const transactions = JSON.parse(result);
    return res.json({ err: false, result: transactions }).send();
  });
});

/*
 * URL: /v2/billing/transfers/count
 * METHOD: GET
 * Description: Get balance transfers count
 */
router.get('/transfers/count', (req, res) => {
  req.checkQuery({
    startDate: {
      notEmpty: true
    },
    endDate: {
      notEmpty: true
    },
    virtualNetwork: {
      optional: true
    },
    regionCode: {
      optional: true
    },
  });

  const errors = req.validationErrors(true);
  if (errors) {
    return res.status(200).json({ err: true, err_msg: errors }).send();
  }


  const requestUrl = `${billingConf.host}/jbilling/rest/analytics/payment/getTransferCount`;
  const prefix = req.administrator.customer.prefix;

  const startDate = new Date(req.query.startDate).getTime();
  const endDate = new Date(req.query.endDate).getTime();
  const virtualNetwork = req.query.virtualNetwork;
  const regionCode = req.query.regionCode;


  const queryString = {
    prefix,
    startDate,
    endDate,
    reseller: virtualNetwork || '',
    paymentMethod: 'ALL',
    country: regionCode || ''
  };

  request.get(requestUrl, {
    qs: queryString
  }, (err, httpResponse, result) => {
    if (err || result.err) {
      global.log.error(err);
      return res.json({ err: true, err_msg: 'BILLING_SERVICE_ERROR', result: err }).send();
    }
    const transactions = JSON.parse(result);
    return res.json({ err: false, result: transactions }).send();
  });
});

module.exports = router;
