const express = require('express');
const logger = require('../../../services/logger');
const paymentSubscriptionService = require('../../../services/payment/subscription');


const router = express.Router();


/**
 * URL: /v2/payments/subscriptions
 * METHOD: POST
 * Description: Subscribe to the customer
 */

router.post('/', async (req, res) => {
  req.checkBody({
    customer: {
      notEmpty: true,
      isObject: true,
    },
    authorizedCardToken: {
      notEmpty: true,
      isObject: true
    },
  });
  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: 'VALIDATION_ERROR', result: errors });
  }

  const { customer, authorizedCardToken } = req.body;

  try {
    await paymentSubscriptionService.subscribeCustomer(null, {
      customer,
      authorizedCardToken
    });
    res.json({ err: false, result: { subscribed: true } });
  } catch (e) {
    logger.error(e);
    return res.json({ err: true, err_msg: 'SUBSCRIPTION_ERROR', result: e.message });
  }
});

module.exports = router;
