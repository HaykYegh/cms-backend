const express = require('express');
const logger = require('../../../services/logger');
const paymentErrorService = require('../../../services/payment/error');

const router = express.Router();


/*
 * URL: /v2/billing/errors
 * METHOD: GET
 * Description: Get billing errors
 */

router.get('/', async (req, res) => {
  const customerId = req.customerId;

  try {
    const errors = await paymentErrorService.get.errors(null, {
      customerId
    });

    return res.json({ err: false, result: errors });
  } catch (e) {
    logger.error(e.message);
    return res.json({ err: true, err_msg: e.message });
  }
});


module.exports = router;
