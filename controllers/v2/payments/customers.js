const express = require('express');
const logger = require('../../../services/logger');
const paymentCustomerService = require('../../../services/payment/customer');
const customerService = require('../../../services/customers');


const router = express.Router();

/**
 * URL: /v2/payments/customers/:customerId
 * METHOD: GET
 * Description: Get customer
 */

router.get('/:customerId', async (req, res) => {
  req.checkParams({
    customerId: {
      notEmpty: true,
      isNumber: true
    }
  });
  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: 'VALIDATION_ERROR', result: errors });
  }

  const { customerId } = req.params;

  try {
    const result = await paymentCustomerService.getByCustomerId(null, { customerId });
    return res.json({ err: false, result });
  } catch (e) {
    logger.error(e);
    return res.json({ err: true, err_msg: 'DB_ERROR', result: e.message });
  }
});


/**
 * URL: /v2/payments/customers
 * METHOD: POST
 * Description: Create a customer
 */

router.post('/', async (req, res) => {
  req.checkBody({
    customer: {
      notEmpty: true,
      isObject: true
    },
    priceId: {
      optional: true,
      isNumber: true
    }
  });
  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: 'VALIDATION_ERROR', result: errors });
  }

  const { customer, priceId } = req.body;

  try {
    const authorizedStripeCustomer = await paymentCustomerService.authorize({
      email: customer.email,
      description: `Customer: ${customer.email}, CreatedAt:${new Date()}, Creator: ${customer.email}`
    });
    logger.info(`authorizeStripeCustomer => ${JSON.stringify(authorizedStripeCustomer)}`);

    const stripeCustomer = await paymentCustomerService.create(null, {
      token: authorizedStripeCustomer.id, customerId: customer.id, priceId
    });
    logger.info(`stripeCustomer => ${JSON.stringify(stripeCustomer)}`);

    res.json({ err: false, result: stripeCustomer });
  } catch (e) {
    logger.error(e);

    res.json({ err: true, err_msg: 'DB_ERROR', result: e.message });
  }
});


/**
 * URL: /v2/payments/customers
 * METHOD: POST
 * Description: Delete customers by customerId
 */

router.delete('/', async (req, res) => {
  const customerId = req.customerId;
  try {
    const stripeCustomer = await paymentCustomerService.getByCustomerId(null, {
      customerId
    });
    const token = stripeCustomer.token;
    const result = await paymentCustomerService.unAuthorize(token);

    if (result.deleted) {
      await paymentCustomerService.delete.customers(null, { customerId });
      return res.json({ err: false, result: { deleted: true } });
    }

    res.json({ err: true, err_msg: 'UNKNOWN_ERROR' });
  } catch (e) {
    logger.error(e);

    res.json({ err: true, err_msg: 'DB_ERROR', result: e.message });
  }
});


/**
 * URL: /v2/payments/customers/bill
 * METHOD: POST
 * Description: Purchasing the monthly plan
 */

router.post('/bill', async (req, res) => {
  const customerId = req.customerId;

  try {
    const stripeCustomer = await paymentCustomerService.getByCustomerId(null, {
      customerId
    });
    const payment = await paymentCustomerService.billCustomer(stripeCustomer);

    if (!payment || !payment.paid) {
      await customerService.update.customerStatus(null, {
        customerId,
        status: 2
      });

      return res.json({ err: true, err_msg: payment.errorMessage });
    }

    res.json({ err: false, result: { successful: true } });
  } catch (e) {
    logger.error(e);

    res.json({ err: true, err_msg: 'PAYMENT_ERROR', result: e.message });
  }
});


module.exports = router;
