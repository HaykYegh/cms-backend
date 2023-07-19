const express = require('express');
const paymentSubscriptionService = require('../../../../services/payment/subscription');
const logger = require('../../../../services/logger');

const router = express.Router();


/**
 * URL: /networks/v1/subscriptions
 * METHOD: POST
 * Description: Subscribe customer to network
 */


router.post('/', async (req, res) => {
  req.checkBody({
    source: {
      optional: true,
      isString: true
    }
  });
  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: 'VALIDATION_ERROR', result: errors });
  }

  const { source } = req.body;
  const { customerId, adminId, networkId } = req;
  const meta = { email: req.admin.email, nickname: req.network.nickname };

  // console.log({ meta });

  try {
    const result = await paymentSubscriptionService.create(null, {
      customerId, adminId, networkId, source, meta
    });
    res.json({ err: false, result });
  } catch (e) {
    logger.error(e);
    res.json({ err: true, err_msg: 'SUBSCRIPTION_CREATE_ERROR', result: e.message });
  }
});


module.exports = router;
