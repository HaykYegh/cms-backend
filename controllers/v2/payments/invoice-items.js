const express = require('express');
const paymentInvoiceItemService = require('../../../services/payment/invoice-item');
const paymentCustomerService = require('../../../services/payment/customer');
const paymentPriceService = require('../../../services/payment/price');
const logger = require('../../../services/logger');

const router = express.Router();


/**
 * URL: /v2/payments/invoices
 * METHOD: POST
 * Description: Create invoice item
 */

router.post('/', async (req, res) => {
  req.checkBody({
    customer: {
      notEmpty: true,
      isObject: true,
    },
    period: {
      optional: true,
      isObject: true,
    },
  });
  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: 'VALIDATION_ERROR', result: errors });
  }
  const { customer, period } = req.body;

  try {
    const stripeCustomer = await paymentCustomerService.get(null, { customerId: customer.id });
    logger.info(`stripeCustomer => ${JSON.stringify(stripeCustomer)}`);
    const price = await paymentPriceService.get(null, { priceId: stripeCustomer.priceId });
    logger.info(`price => ${JSON.stringify(price)}`);

    const authorizedInvoiceItem = await paymentInvoiceItemService.authorize({
      customerToken: stripeCustomer.token, priceToken: price.token, period,
    });
    logger.info(`authorizedInvoiceItem => ${JSON.stringify(authorizedInvoiceItem)}`);

    res.json({ err: false, result: authorizedInvoiceItem });
  } catch (e) {
    logger.error(e);
    res.json({ err: true, err_msg: 'STRIPE_ERROR', result: e.message });
  }
});

module.exports = router;
