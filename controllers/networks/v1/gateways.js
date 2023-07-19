/* eslint-disable no-restricted-syntax */
const express = require('express');
const logger = require('../../../services/logger');
const gatewayService = require('../../../services/gateway');


const router = express.Router();


/**
 * URL: /networks/v1/gateways/health
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
  const username = req.query.username || '';
  const password = req.query.password || '';
  const callee = req.query.callee || '';
  const caller = req.query.caller || '';
  const dialPrefix = req.query.dialPrefix || '';

  try {
    const result = await gatewayService.healthCheck({
      host, username, password, callee, dialPrefix, caller
    });
    res.json({ err: false, result });
  } catch (e) {
    logger.error(e);
    res.json({ err: true, err_msg: e.message });
  }
});


/**
 * URL: /networks/v1/gateways
 * METHOD: GET
 * Description: GET gateways
 */

router.get('/', async (req, res) => {
  req.checkQuery({
    offset: {
      notEmpty: true,
      isNumber: true
    },
    limit: {
      notEmpty: true,
      isNumber: true
    }
  });
  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: 'VALIDATION_ERROR', result: errors });
  }


  const networkNickName = req.network.nickname;
  const prefix = req.admin.customer.prefix;
  const limit = parseInt(req.query.limit, 10);
  const offset = (req.query.offset) * limit;

  try {
    const result = await gatewayService.fetchAll({ prefix, networkNickName, limit, offset });
    res.json({ err: false, result });
  } catch (e) {
    logger.error(e);
    res.json({ err: true, err_msg: e.message || e });
  }
});


/**
 * URL: /networks/v1/gateways/:gatewayId
 * METHOD: GET
 * Description: GET gateway details by ID
 */

router.get('/:gatewayId', async (req, res) => {
  req.checkParams({
    gatewayId: {
      notEmpty: true,
      isNumber: true
    }
  });
  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: 'VALIDATION_ERROR', result: errors });
  }

  const networkNickName = req.network.nickname;
  const gatewayId = +req.params.gatewayId;
  const prefix = req.admin.customer.prefix;

  try {
    const result = await gatewayService.fetchOne({ prefix, gatewayId, networkNickName });
    res.json({ err: false, result });
  } catch (e) {
    logger.error(e);
    res.json({ err: true, err_msg: e.message || e });
  }
});


/**
 * URL: /v1/gateways
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
    dialPrefix: {
      optional: true,
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
    }
  });

  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: 'VALIDATION_ERROR', result: errors });
  }
  const networkNickName = req.network.nickname;
  const prefix = req.admin.customer.prefix;
  const param1 = 0;
  const param2 = 0;
  const params = { ...req.body, prefix, networkNickName, param1, param2 };

  try {
    const result = await gatewayService.create(params);
    res.json({ err: false, result });
  } catch (e) {
    logger.error(e);
    res.json({ err: true, err_msg: e.message || e });
  }
});

/**
 * URL: /v1/gateways/:gatewayId
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
    dialPrefix: {
      optional: true,
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
    }
  });
  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: 'VALIDATION_ERROR', result: errors });
  }

  const networkNickName = req.network.nickname;
  const prefix = req.admin.customer.prefix;
  const gatewayId = req.params.gatewayId;
  const param1 = 0;
  const param2 = 0;
  const params = { ...req.body, prefix, networkNickName, gatewayId, param1, param2 };

  try {
    const result = await gatewayService.update(params);
    res.json({ err: false, result });
  } catch (e) {
    logger.error(e);
    res.json({ err: true, err_msg: e.message || e });
  }
});


/**
 * URL: /networks/v1/gateways/:gatewayId
 * METHOD: DELETE
 * Description: DELETE gateway
 */

router.delete('/:gatewayId', async (req, res) => {
  req.checkParams({
    gatewayId: {
      notEmpty: true,
      isNumber: true
    }
  });
  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: 'VALIDATION_ERROR', result: errors });
  }

  const networkNickName = req.network.nickname;
  const prefix = req.admin.customer.prefix;
  const gatewayId = req.params.gatewayId;

  try {
    const result = await gatewayService.delete({ prefix, gatewayId, networkNickName });
    res.json({ err: false, result });
  } catch (e) {
    logger.error(e);
    res.json({ err: true, err_msg: e.message || e });
  }
});


module.exports = router;
