const express = require('express');
const logger = require('../../../services/logger');
const subscriptionItemService = require('../../../services/payment/subscription-item');
const usageReportService = require('../../../services/payment/usage-record');

const router = express.Router();


/**
 * URL: /v2/payments/usage-records
 * METHOD: POST
 * Description: Create usage record
 */

router.post('/', async (req, res) => {
  req.checkBody({
    quantity: {
      notEmpty: true,
      isNumber: true,
    },
    customerId: {
      notEmpty: true,
      isNumber: true,
    },
  });
  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: 'VALIDATION_ERROR', result: errors });
  }
  const { quantity, timestamp, action, customerId } = req.body;

  try {
    const subscriptionItems = await subscriptionItemService.list(null, { customerId });
    if (!subscriptionItems[0]) {
      throw new Error('The customer has no subscription items.');
    }

    const subscriptionItemToken = subscriptionItems[0].token;
    const result = await usageReportService.add({
      subscriptionItemToken, quantity, timestamp, action
    });

    res.json({ err: false, result });
  } catch (e) {
    logger.error(e);
    res.json({ err: true, err_msg: 'USAGE_RECORD_ERROR', result: e.message });
  }
});

/**
 * URL: /v2/payments/usage-records
 * METHOD: GET
 * Description: Get usage records
 */

router.get('/', async (req, res) => {
  req.checkBody({
    customerId: {
      notEmpty: true,
      isNumber: true,
    },
  });
  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: 'VALIDATION_ERROR', result: errors });
  }
  const { customerId } = req.body;

  try {
    const subscriptionItems = await subscriptionItemService.list(null, { customerId });
    if (!subscriptionItems[0]) {
      throw new Error('The customer has no subscription items.');
    }

    const subscriptionItemToken = subscriptionItems[0].token;
    const result = await usageReportService.get(subscriptionItemToken);

    res.json({ err: false, result });
  } catch (e) {
    logger.error(e);
    res.json({ err: true, err_msg: 'USAGE_RECORD_ERROR', result: e.message });
  }
});


module.exports = router;
