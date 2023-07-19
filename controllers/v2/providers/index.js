const express = require('express');
const isString = require('lodash/isString');
const logger = require('../../../services/logger');
const providerService = require('../../../services/third-party-providers');

const router = express.Router();

router.use('/', require('./provider-types'));
router.use('/', require('./countries'));

/**
 * URL: /v2/providers
 * METHOD: GET
 * Description: Get third party providers list
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
    },
    providerType: {
      optional: true,
      isString: true
    }
  });

  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: 'VALIDATION_ERROR', result: errors });
  }

  const customerId = req.customerId;
  const limit = +req.query.limit;
  const offset = +req.query.offset * limit;
  const providerType = req.query.providerType || null;

  try {
    const result = await providerService.list.providers(null,
      { customerId, providerType, limit, offset });
    res.json({ err: false, result });
  } catch (e) {
    logger.error(e);
    res.json({ err: true, err_msg: e.message });
  }
});

/**
 * URL: /v2/providers/count
 * METHOD: GET
 * Description: Get third party providers count
 */

router.get('/count', async (req, res) => {
  req.checkQuery({
    providerType: {
      optional: true,
      isString: true
    }
  });

  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: 'VALIDATION_ERROR', result: errors });
  }

  const customerId = req.customerId;
  const providerType = req.query.providerType || null;

  try {
    const result = await providerService.count.providers(null, { customerId, providerType });
    res.json({ err: false, result });
  } catch (e) {
    logger.error(e);
    res.json({ err: true, err_msg: e.message });
  }
});


/**
 * URL: /v2/providers/:providerId
 * METHOD: GET
 * Description: Get specific provider
 */

router.get('/:providerId', async (req, res) => {
  req.checkParams({
    providerId: {
      notEmpty: true,
      isNumber: true
    }
  });

  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: 'VALIDATION_ERROR', result: errors });
  }

  const customerId = req.customerId;
  const providerId = req.params.providerId;

  try {
    const result = await providerService.retrieve.provider(null, { customerId, providerId });
    res.json({ err: false, result });
  } catch (e) {
    logger.error(e);
    res.json({ err: true, err_msg: e.message });
  }
});


/**
 * URL: /v2/providers
 * METHOD: POST
 * Description: Create provider
 */

router.post('/', async (req, res) => {
  req.checkBody({
    tp2Id: {
      notEmpty: true,
      isNumber: true
    },
    label: {
      notEmpty: true,
      isString: true
    },
    config: {
      notEmpty: true,
      isObject: true
    },
    orderNumber: {
      notEmpty: true,
      isNumber: true
    }
  });

  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: 'VALIDATION_ERROR', result: errors });
  }

  const customerId = req.customerId;
  const tp2Id = req.body.tp2Id;
  const label = req.body.label;
  const config = JSON.stringify(req.body.config);
  const orderNumber = req.body.orderNumber;

  try {
    const result = await providerService
      .create
      .provider(null, { customerId, tp2Id, label, config, orderNumber });
    res.json({ err: false, result });
  } catch (e) {
    logger.error(e);
    res.json({ err: true, err_msg: e.message });
  }
});


/**
 * URL: /v2/providers/:providerId
 * METHOD: PUT
 * Description: Update provider
 */

router.put('/:providerId', async (req, res) => {
  req.checkBody({
    label: {
      notEmpty: true,
      isString: true
    },
    config: {
      notEmpty: true,
      isObject: true
    },
    orderNumber: {
      notEmpty: true,
      isNumber: true
    },
    active: {
      notEmpty: true,
      isBoolean: true
    }
  });
  req.checkParams({
    providerId: {
      notEmpty: true,
      isNumber: true
    }
  });

  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: 'VALIDATION_ERROR', result: errors });
  }

  const customerId = req.customerId;
  const providerId = req.params.providerId;
  const label = req.body.label;
  const config = req.body.config;
  const orderNumber = req.body.orderNumber;
  const active = req.body.active;

  try {
    const result = await providerService
      .update
      .provider(null, { customerId, providerId, label, config, orderNumber, active });
    res.json({ err: false, result });
  } catch (e) {
    logger.error(e);
    res.json({ err: true, err_msg: e.message });
  }
});

/**
 * URL: /v2/providers/:providerId
 * METHOD: GET
 * Description: Get specific provider
 */

router.delete('/:providerId', async (req, res) => {
  req.checkParams({
    providerId: {
      notEmpty: true,
      isNumber: true
    }
  });

  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: 'VALIDATION_ERROR', result: errors });
  }

  const customerId = req.customerId;
  const providerId = req.params.providerId;

  try {
    const result = await providerService.delete.provider(null, { customerId, providerId });
    res.json({ err: false, result });
  } catch (e) {
    logger.error(e);
    res.json({ err: true, err_msg: e.message });
  }
});


/**
 * URL: /v2/providers/:providerId/transmit
 * METHOD: POST
 * Description: Send message using provider
 */

router.post('/:providerId/transmit', async (req, res) => {
  req.checkParams({
    providerId: {
      notEmpty: true,
      isNumber: true
    }
  });
  req.checkBody({
    subject: {
      notEmpty: true,
      isString: true
    },
    message: {
      notEmpty: true,
      isString: true
    },
    receivers: {
      notEmpty: true,
      isArray: true
    }
  });

  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: 'VALIDATION_ERROR', result: errors });
  }

  const customerId = req.customerId;
  const providerId = req.params.providerId;
  const receivers = req.body.receivers.filter(receiver => isString(receiver));

  if (receivers.length === 0) {
    return res.json({ err: true, err_msg: 'INVALID_RECEIVERS' });
  }
  const message = req.body.message;
  const subject = req.body.subject;

  logger.info({providerId});
  try {
    const result = await providerService
      .transmit(null, { customerId, providerId, receivers, subject, message });
    res.json({ err: false, result });
  } catch (e) {
    logger.error(e);
    res.json({ err: true, err_msg: e.message });
  }
});


module.exports = router;
