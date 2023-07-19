const express = require('express');
const config = require('config');
const request = require('request');
const helpers = require('../../../helpers');

const router = express.Router();


/*
 * URL: /v2/billing/balance/:number
 * METHOD: PUT
 * Description: PUT Add user balance
 */
router.put('/:number', (req, res) => {
  req.checkParams({
    number: {
      notEmpty: true,
      isNumber: true,
    }
  });
  req.checkBody({
    amount: {
      notEmpty: true,
      isNumber: true,
    },
    currency: {
      notEmpty: true
    }
  });

  const errors = req.validationErrors(true);
  if (errors) {
    return res.status(200).json({ err: true, err_msg: errors }).send();
  }

  const prefix = req.administrator.customer.prefix;
  const billingConf = config.get(`billing.${helpers.getConfigKey(prefix)}`);
  const number = prefix + req.params.number;
  const amount = req.body.amount;
  const currency = req.body.currency;

  const requestUrl = `${billingConf.host}/jbilling/calback/admin`;

  const queryString = {
    fromUser: req.administrator.customer.customerBusinessNumber,
    toUser: number,
    amount,
    currency,
    description: `Add balance. Admin: ${req.administrator.email}, Date: ${new Date()}`
  };
  console.log(queryString);

  request.get(requestUrl, {
    qs: queryString
  }, (err, httpResponse, result) => {
    if (err || result.err) {
      global.log.error(err);
      return res.json({ err: true, err_msg: 'BILLING_SERVICE_ERROR', result: err }).send();
    }
    let added;

    try {
      added = JSON.parse(result);
    } catch (e) {
      global.log.error(e);
      global.log.error(result);
      return res.json({ err: true, err_msg: 'BILLING_SERVICE_ERROR', result: err }).send();
    }
    return res.json({ err: false, result: added }).send();
  });
});


/*
 * URL: /v2/billing/balance
 * METHOD: GET
 * Description: GET Add user balance
 */
router.get('/', (req, res) => {
  req.checkQuery({
    number: {
      notEmpty: true,
      isNumber: true,
    }
  });

  const errors = req.validationErrors(true);
  if (errors) {
    return res.status(200).json({ err: true, err_msg: errors }).send();
  }


  const prefix = req.administrator.customer.prefix;
  const billingConf = config.get(`billing.${helpers.getConfigKey(prefix)}`);
  const username = prefix + req.query.number;

  const requestUrl = `${billingConf.host}/jbilling/rest/json/getBalance`;

  const queryString = {
    username
  };
  request.get(requestUrl, {
    qs: queryString
  }, (err, httpResponse, result) => {
    if (err || result.err) {
      global.log.error(err);
      // return res.json({ err: true, err_msg: 'SERVICE_ERROR', result: err }).send();
    }
    let balance = 0.00;

    try {
      balance = JSON.parse(result);
    } catch (e) {
      global.log.error(e);
      global.log.error(result);
      // return res.json({ err: true, err_msg: 'BILLING_SERVICE_ERROR', result: err }).send();
    }
    return res.json({ err: false, result: balance });
  });
});


module.exports = router;
