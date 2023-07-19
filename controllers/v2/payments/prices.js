const express = require('express');
const logger = require('../../../services/logger');
const paymentProductPriceService = require('../../../services/payment/price');

const router = express.Router();


/**
 * URL: /v2/payments/products/prices
 * METHOD: POST
 * Description: Create product price
 */

router.post('/', async (req, res) => {
  req.checkBody({
    customerId: {
      notEmpty: true,
      isNumber: true
    },
    unitAmount: {
      notEmpty: true,
      isNumber: true
    },
    currency: {
      notEmpty: true,
      isString: true
    },
    recurring: {
      notEmpty: true,
      isObject: true
    },
  });
  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: 'VALIDATION_ERROR', result: errors });
  }

  const { customerId, unitAmount, currency, recurring } = req.body;
  const price = { customerId, unitAmount, currency, recurring };
  logger.info(`price => ${price}`);

  try {
    const result = await paymentProductPriceService.create(price);
    res.json({ err: false, result });
  } catch (e) {
    logger.error(e);
    res.json({ err: true, err_msg: 'PAYMENT_PRODUCT_PRICE_CREATE_ERROR', result: e.message });
  }
});

module.exports = router;
