const express = require('express');
const logger = require('../../../services/logger');
const paymentInvoiceService = require('../../../services/payment/invoice');
const paymentCustomerService = require('../../../services/payment/customer');

const router = express.Router();


/**
 * URL: /v2/payments/invoices
 * METHOD: POST
 * Description: Create an invoice
 */

router.post('/', async (req, res) => {
  req.checkBody({
    customer: {
      notEmpty: true,
      isObject: true,
    },
    autoAdvance: {
      optional: true,
      isBoolean: true,
    },
  });
  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: 'VALIDATION_ERROR', result: errors });
  }

  const { customer, autoAdvance } = req.body;

  try {
    const stripeCustomer = await paymentCustomerService.get(null, { customerId: customer.id });
    if (!stripeCustomer) {
      throw new Error('NO_SUCH_CUSTOMER');
    }
    logger.info(`stripeCustomer => ${JSON.stringify(stripeCustomer)}`);

    try {
      const authorizedInvoice = await paymentInvoiceService.authorize({
        customerToken: stripeCustomer.token, autoAdvance,
      });
      logger.info(`authorizedInvoice => ${JSON.stringify(authorizedInvoice)}`);
      res.json({ err: false, result: authorizedInvoice });
    } catch (e) {
      logger.error(e);

      res.json({ err: true, err_msg: 'STRIPE_ERROR', result: e.message });
    }
  } catch (e) {
    logger.error(e);

    res.json({ err: true, err_msg: 'DB_ERROR', result: e.message });
  }
});

router.use('/items', require('./invoice-items'));

module.exports = router;
