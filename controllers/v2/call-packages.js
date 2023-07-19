const express = require('express');
const request = require('request');
const config = require('config');
const helpers = require('../../helpers');


const router = express.Router();

/**
 * URL: /v2/call-packages
 * METHOD: GET
 * Description: GET customer call package list
 */

router.get('/', (req, res) => {
  req.checkQuery({
    offset: {
      notEmpty: true
    }
  });
  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: errors }).send();
  }
  const limit = 20;
  const offset = parseInt(req.query.offset, 10) * limit;

  const prefix = req.administrator.customer.prefix;
  const billingConf = config.get(`billing.${helpers.getConfigKey(prefix)}`);


  const requestUrl = `${billingConf.host}/jbilling/rest/item/getCustomerPackets`;

  const queryString = {
    prefix,
    offset,
    limit
  };
  request.get(requestUrl, {
    qs: queryString
  }, (err, httpResponse, result) => {
    if (err || result.err) {
      global.log.error(err);
      return res.json({ err: true, err_msg: 'BILLING_SERVICE_ERROR', result: err }).send();
    }
    let callPackages;
    try {
      callPackages = JSON.parse(result);
    } catch (e) {
      global.log.error(e);
      global.log.error(result);
      return res.json({ err: true, err_msg: 'BILLING_SERVICE_ERROR', result: err }).send();
    }
    return res.json({ err: false, result: callPackages }).send();
  });
});

/**
 * URL: /v2/call-packages/:callPackageId
 * METHOD: GET
 * Description: GET call package item
 */

router.get('/:callPackageId', (req, res) => {
  req.checkParams({
    callPackageId: {
      notEmpty: true,
      // isNumber: true
    }
  });
  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: errors }).send();
  }
  const prefix = req.administrator.customer.prefix;
  const billingConf = config.get(`billing.${helpers.getConfigKey(prefix)}`);

  const callPackageId = req.params.callPackageId;
  const requestUrl = `${billingConf.host}/jbilling/rest/item/getCustomerPacket`;

  const queryString = {
    id: callPackageId,
    prefix,
  };
  request.get(requestUrl, {
    qs: queryString
  }, (err, httpResponse, result) => {
    if (err || result.err) {
      global.log.error(err);
      return res.json({ err: true, err_msg: 'BILLING_SERVICE_ERROR', result: err }).send();
    }
    if (!result) {
      return res.json({ err: true, err_msg: 'NOT_FOUND' }).send();
    }
    let callPackage;
    try {
      callPackage = JSON.parse(result);
    } catch (e) {
      global.log.error(e);
      global.log.error(result);
      return res.json({ err: true, err_msg: 'BILLING_SERVICE_ERROR', result: err }).send();
    }
    return res.json({ err: false, result: callPackage }).send();
  });
});


/**
 * URL: /v2/call-packages
 * METHOD: POST
 * Description: POST Create create customer call package.
 */

router.post('/', (req, res) => {
  req.checkBody({
    countryCodes: {
      notEmpty: true,
      isArray: true
    },
    cost: {
      notEmpty: true,
      isFloatNumber: true
    },
    minutes: {
      notEmpty: true,
      isFloatNumber: true
    },
    days: {
      notEmpty: true,
      isFloatNumber: true
    }
  });
  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: errors }).send();
  }

  const prefix = req.administrator.customer.prefix;
  const billingConf = config.get(`billing.${helpers.getConfigKey(prefix)}`);
  const requestUrl = `${billingConf.host}/jbilling/rest/item/addPacket`;

  const countries = req.body.countryCodes.join('-');
  const cost = req.body.cost;
  const minutes = req.body.minutes;
  const days = req.body.days;


  const queryString = {
    prefix,
    amount: cost,
    country: countries,
    count: minutes,
    activeDays: days,
  };
  request.get(requestUrl, {
    qs: queryString
  }, (err, httpResponse, result) => {
    if (err || result.err) {
      global.log.error(err);
      return res.json({ err: true, err_msg: 'BILLING_SERVICE_ERROR', result: err }).send();
    }
    let packageId;
    try {
      packageId = JSON.parse(result);
    } catch (e) {
      global.log.error(e);
      global.log.error(result);
      return res.json({ err: true, err_msg: 'BILLING_SERVICE_ERROR', result: err }).send();
    }
    return res.json({ err: false, result: { id: packageId } }).send();
  });
});

/**
 * URL: /v2/call-packages/:callPackageId
 * METHOD: PUT
 * Description: PUT Update customer call package.
 */

router.put('/:callPackageId', (req, res) => {
  req.checkBody({
    countryCodes: {
      notEmpty: true,
      isArray: true
    },
    cost: {
      notEmpty: true,
      isFloatNumber: true
    },
    minutes: {
      notEmpty: true,
      isFloatNumber: true
    },
    days: {
      notEmpty: true,
      isFloatNumber: true
    },
    top: {
      notEmpty: true,
      isBoolean: true
    }
  });
  req.checkParams({
    callPackageId: {
      notEmpty: true,
      isNumber: true
    },
  });

  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: errors }).send();
  }

  const prefix = req.administrator.customer.prefix;
  const billingConf = config.get(`billing.${helpers.getConfigKey(prefix)}`);

  const requestUrl = `${billingConf.host}/jbilling/rest/item/updatePacket`;

  const countryCodes = req.body.countryCodes;
  const cost = req.body.cost;
  const minutes = req.body.minutes;
  const days = req.body.days;
  const top = req.body.top;
  const callPackageId = req.params.callPackageId;


  const queryString = {
    packetId: callPackageId

  };
  const formData = {
    cost,
    countryCodes,
    minutes,
    days,
    top,
    id: callPackageId
  };

  request.put(requestUrl, {
    json: formData,
    qs: queryString
  }, (err, httpResponse, result) => {
    if (err || result.err) {
      global.log.error(err);
      return res.json({ err: true, err_msg: 'BILLING_SERVICE_ERROR', result: err }).send();
    }
    let callPackage;
    try {
      callPackage = JSON.parse(result);
    } catch (e) {
      global.log.error(e);
      global.log.error(result);
      return res.json({ err: true, err_msg: 'BILLING_SERVICE_ERROR', result: err }).send();
    }
    return res.json({ err: false, result: callPackage }).send();
  });
});


/**
 * URL: /v2/call-packages/:callPackageId
 * METHOD: DELETE
 * Description: DELETE Delete customer call package.
 */

router.delete('/:callPackageId', (req, res) => {
  req.checkParams({
    callPackageId: {
      notEmpty: true,
      isNumber: true
    },
  });

  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: errors }).send();
  }

  const prefix = req.administrator.customer.prefix;
  const billingConf = config.get(`billing.${helpers.getConfigKey(prefix)}`);

  const requestUrl = `${billingConf.host}/jbilling/rest/item/deletePacket`;
  const callPackageId = req.params.callPackageId;

  const queryString = {
    prefix,
    id: callPackageId
  };

  request.get(requestUrl, {
    qs: queryString
  }, (err, httpResponse, result) => {
    if (err || result.err) {
      global.log.error(err);
      return res.json({ err: true, err_msg: 'BILLING_SERVICE_ERROR', result: err }).send();
    }
    return res.json({ err: false, result: { deleted: result } }).send();
  });
});
module.exports = router;
