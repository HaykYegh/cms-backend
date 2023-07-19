const express = require('express');
const systemMessageService = require('../../../services/system-message');
const utils = require('../../../helpers/utils');
const logger = require('../../../services/logger');

const router = express.Router();


/**
 * URL: /v2/notifications/senders
 * METHOD: GET
 * Description: Get sender list
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
  const customerId = req.customerId;
  const limit = +req.query.limit;
  const offset = parseInt(req.query.offset, 10) * limit;

  try {
    const result = await systemMessageService
      .senders
      .list
      .senders(null, { customerId, limit, offset });
    res.json({ err: false, result });
  } catch (e) {
    logger.error(e);
    res.json({ err: true, err_msg: e.message });
  }
});

/**
 * URL: /v2/notifications/senders/count
 * METHOD: GET
 * Description: Get senders count
 */

router.get('/count', async (req, res) => {
  const customerId = req.customerId;

  try {
    const result = await systemMessageService
      .senders
      .count
      .senders(null, { customerId });
    res.json({ err: false, result });
  } catch (e) {
    logger.error(e);
    res.json({ err: true, err_msg: e.message });
  }
});


/**
 * URL: /v2/notifications/senders
 * METHOD: POST
 * Description: Create sender
 */

router.post('/', async (req, res) => {
  req.checkBody({
    label: {
      notEmpty: true,
      isString: true
    },
    number: {
      notEmpty: true,
      isString: true
    },
    isVerified: {
      notEmpty: true,
      isBoolean: true
    }
  });
  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: 'VALIDATION_ERROR', result: errors });
  }
  const customerId = req.customerId;
  const { label, number, isVerified } = req.body;

  try {
    const result = await systemMessageService
      .senders
      .create
      .sender(null, { customerId, label, number, isVerified });
    res.json({ err: false, result });
  } catch (e) {
    logger.error(e);
    res.json({ err: true, err_msg: e.message });
  }
});


/**
 * URL: /v2/notifications/senders/:senderId
 * METHOD: PUT
 * Description: Update sender
 */

router.put('/:senderId', async (req, res) => {
  req.checkBody({
    label: {
      notEmpty: true,
      isString: true
    },
    number: {
      notEmpty: true,
      isString: true
    },
    isVerified: {
      notEmpty: true,
      isBoolean: true
    }
  });
  req.checkParams({
    senderId: {
      notEmpty: true,
      isString: true
    }
  });
  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: 'VALIDATION_ERROR', result: errors });
  }
  const customerId = req.customerId;
  const { label, number, isVerified } = req.body;
  const { senderId } = req.params;

  try {
    const result = await systemMessageService
      .senders
      .update
      .sender(null, { customerId, senderId, label, number, isVerified });
    res.json({ err: false, result });
  } catch (e) {
    logger.error(e);
    res.json({ err: true, err_msg: e.message });
  }
});

/**
 * URL: /v2/notifications/senders/:senderId
 * METHOD: DELETE
 * Description: Delete sender
 */

router.delete('/:senderId', async (req, res) => {
  req.checkParams({
    senderId: {
      notEmpty: true,
      isString: true
    }
  });
  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: 'VALIDATION_ERROR', result: errors });
  }
  const customerId = req.customerId;
  const { senderId } = req.params;

  try {
    const result = await systemMessageService
        .senders
        .delete
        .sender(null, { customerId, senderId });
    res.json({ err: false, result });
  } catch (e) {
    logger.error(e);
    res.json({ err: true, err_msg: e.message });
  }
});

/**
 * URL: /v2/notifications/senders/:senderId
 * METHOD: GET
 * Description: Get specific sender
 */

router.get('/:senderId', async (req, res) => {
  req.checkParams({
    senderId: {
      notEmpty: true,
      isString: true
    }
  });
  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: 'VALIDATION_ERROR', result: errors });
  }
  const customerId = req.customerId;
  const { senderId } = req.params;

  try {
    const result = await systemMessageService
      .senders
      .retrieve
      .sender(null, { customerId, senderId });
    res.json({ err: false, result });
  } catch (e) {
    logger.error(e);
    res.json({ err: true, err_msg: e.message });
  }
});


/**
 * URL: /v2/notifications/senders/:senderId/images
 * METHOD: GET
 * Description: Get sender images
 */

router.get('/:senderId/images', async (req, res) => {
  req.checkParams({
    senderId: {
      notEmpty: true,
      isString: true
    }
  });
  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: 'VALIDATION_ERROR', result: errors });
  }
  const customerId = req.customerId;
  const { senderId } = req.params;

  try {
    const result = await systemMessageService
      .senders
      .list
      .images(null, { customerId, senderId });
    res.json({ err: false, result });
  } catch (e) {
    logger.error(e);
    res.json({ err: true, err_msg: e.message });
  }
});


/**
 * URL: /v2/notifications/senders/:senderId/images
 * METHOD: POST
 * Description: Create or update avatar for sender
 */

router.post('/:senderId/images', async (req, res) => {
  req.checkParams({
    senderId: {
      notEmpty: true,
      isString: true
    }
  });
  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: 'VALIDATION_ERROR', result: errors });
  }
  const customerId = req.customerId;
  const { senderId } = req.params;

  try {
    const files = await utils.getUploadedFiles(req);
    try {
      const result = await systemMessageService
        .senders
        .create
        .image(null, { customerId, senderId, files });
      res.json({ err: false, result });
    } catch (e) {
      logger.error(e);
      res.json({ err: true, err_msg: e.message });
    }
  } catch (e) {
    logger.error(e);
    res.json({ err: true, err_msg: 'IMAGE_PARSE_ERROR' });
  }
});

module.exports = router;
