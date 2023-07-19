/* eslint-disable no-restricted-syntax */
const express = require('express');
const logger = require('../../../services/logger');
const constants = require('../../../helpers/constants');
const awsService = require('../../../services/aws');
const gatewayService = require('../../../services/gatewayV2');
const customerService = require('../../../services/customers');


const router = express.Router();


/**
 * URL: /networks/v2/gateways/health
 * METHOD: GET
 * Description: Health check for gateway
 */

router.get('/health', async (req, res) => {
  req.checkQuery({
    host: {
      notEmpty: true,
      isString: true
    },
    username: {
      optional: true,
      isString: true
    },
    password: {
      optional: true,
      isString: true
    },
    dialPrefix: {
      optional: true,
      isString: true
    },
    callee: {
      notEmpty: true,
      isString: true
    }
  });

  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: 'VALIDATION_ERROR', result: errors });
  }

  const host = req.query.host;
  const username = req.query.username;
  const password = req.query.password;
  const callee = req.query.callee;
  const dialPrefix = req.query.dialPrefix;

  try {
    const result = await gatewayService.healthCheck({
      host, username, password, callee, dialPrefix
    });
    res.json({ err: false, result });
  } catch (e) {
    logger.error(e);
    res.json({ err: true, err_msg: e.message });
  }
});


/**
 * URL: /networks/v2/gateways
 * METHOD: POST
 * Description: Create gateway
 */

router.post('/', async (req, res) => {
  req.checkBody({
    host: {
      notEmpty: true,
      isString: true
    },
    description: {
      notEmpty: true,
      isString: true
    },
    active: {
      notEmpty: true,
      isBoolean: true
    },
    countries: {
      notEmpty: true,
      isArray: true
    },
    username: {
      optional: true,
      isString: true
    },
    password: {
      optional: true,
      isString: true
    },
    dialPrefix: {
      optional: true,
      isString: true
    },
    callerDialPrefix: {
      optional: true,
      isString: true
    },
    callerCutDigitCount: {
      optional: true,
    },
    calleeCutDigitCount: {
      optional: true,
    },
    network: {
      optional: true,
      isString: true
    },
    userGroupId: {
      optional: true,
      isString: true
    },
    main: {
      optional: true,
      isBoolean: true
    },
    param1: {
      optional: true,
      isFloatNumber: true
    },
    param2: {
      optional: true,
      isFloatNumber: true
    },
    voipModuleAddress: {
      optional: true,
      isString: true
    },
  });

  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: 'VALIDATION_ERROR', result: errors });
  }
  const customerId = req.customerId;

  const host = req.body.host;
  const description = req.body.description;
  const active = req.body.active;
  const main = req.body.main || false;
  const countries = req.body.countries.join(';');
  const username = req.body.username || '';
  const password = req.body.password || '';
  const dialPrefix = req.body.dialPrefix || '';
  const callerDialPrefix = req.body.callerDialPrefix || '';
  const callerCutDigitCount = req.body.callerCutDigitCount || 0;
  const calleeCutDigitCount = req.body.calleeCutDigitCount || 0;

  const userGroupId = req.body.userGroupId || '';
  const voipModuleAddress = req.body.voipModuleAddress || '';
  const param1 = req.body.param1 || 0;
  const param2 = req.body.param2 || 0;

  const network = req.network.nickname;

  const params = {
    customerId,
    host,
    description,
    active,
    main,
    countries,
    username,
    password,
    dialPrefix,
    callerDialPrefix,
    callerCutDigitCount,
    calleeCutDigitCount,
    param1,
    param2,
    userGroupId,
    network,
    voipModuleAddress
  };

  console.log(params)

  try {
    const result = await gatewayService.gateways.create.gateway(params);
    res.json({ err: false, result });
  } catch (e) {
    logger.error(e);
    res.json({ err: true, err_msg: e.message || e });
  }
});

/**
 * URL: /v3/gateways/:gatewayId
 * METHOD: PUT
 * Description: Update gateway gateway
 */

router.put('/:gatewayId', async (req, res) => {
  req.checkParams({
    gatewayId: {
      notEmpty: true,
      isNumber: true
    }
  });
  req.checkBody({
    host: {
      notEmpty: true,
      isString: true
    },
    description: {
      notEmpty: true,
      isString: true
    },
    active: {
      notEmpty: true,
      isBoolean: true
    },
    countries: {
      notEmpty: true,
      isArray: true
    },
    username: {
      optional: true,
      isString: true
    },
    password: {
      optional: true,
      isString: true
    },
    dialPrefix: {
      optional: true,
      isString: true
    },
    callerDialPrefix: {
      optional: true,
      isString: true
    },
    callerCutDigitCount: {
      optional: true,
    },
    calleeCutDigitCount: {
      optional: true,
    },
    network: {
      optional: true,
      isString: true
    },
    userGroupId: {
      optional: true,
      isString: true
    },
    main: {
      optional: true,
      isBoolean: true
    },
    param1: {
      optional: true,
      isFloatNumber: true
    },
    param2: {
      optional: true,
      isFloatNumber: true
    },
    voipModuleAddress: {
      optional: true,
      isString: true
    },
  });
  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: 'VALIDATION_ERROR', result: errors });
  }

  const customerId = req.customerId;
  const gatewayId = req.params.gatewayId;

  const host = req.body.host;
  const description = req.body.description;
  const active = req.body.active;
  const main = req.body.main || false;
  const countries = req.body.countries.join(';');
  const username = req.body.username || '';
  const password = req.body.password || '';
  const dialPrefix = req.body.dialPrefix || '';
  const callerDialPrefix = req.body.callerDialPrefix || '';
  const callerCutDigitCount = req.body.callerCutDigitCount || 0;
  const calleeCutDigitCount = req.body.calleeCutDigitCount || 0;

  const userGroupId = req.body.userGroupId || '';
  const voipModuleAddress = req.body.voipModuleAddress || '';
  const param1 = req.body.param1 || 0;
  const param2 = req.body.param2 || 0;

  const network = req.network.nickname;


  const params = {
    gatewayId,
    customerId,
    host,
    description,
    active,
    main,
    countries,
    username,
    password,
    dialPrefix,
    callerDialPrefix,
    callerCutDigitCount,
    calleeCutDigitCount,
    param1,
    param2,
    userGroupId,
    network,
    voipModuleAddress
  };

  console.log(params);
  try {
    const result = await gatewayService.gateways.update.gateway(params);
    res.json({ err: false, result });
  } catch (e) {
    logger.error(e);
    res.json({ err: true, err_msg: e.message || e });
  }
});

module.exports = router;
