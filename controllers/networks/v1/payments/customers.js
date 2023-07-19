const express = require('express');
const paymentCustomerService = require('../../../../services/payment/customer');
const logger = require('../../../../services/logger');

const router = express.Router();


/**
 * URL: /networks/v1/customers
 * METHOD: GET
 * Description: Get customer
 */

router.get('/', async (req, res) => {
  const { customerId, adminId, networkId } = req;
  try {
    const result = await paymentCustomerService
      .get(null, { customerId, adminId, networkId, withStripe: true });
    res.json({ err: false, result });
  } catch (e) {
    logger.error(e);
    res.json({ err: true, err_msg: 'CUSTOMER_RETRIEVE_ERROR', result: e.message });
  }
});


/**
 * URL: /networks/v1/customers
 * METHOD: POST
 * Description: Update customer, set default source
 */

router.post('/', async (req, res) => {
  req.checkBody({
    defaultSource: {
      notEmpty: true,
      isString: true
    }
  });
  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: 'VALIDATION_ERROR', result: errors });
  }
  const { customerId, adminId, networkId } = req;
  const { defaultSource } = req.body;
  try {
    const result = await paymentCustomerService
      .update(null, { customerId, adminId, networkId, defaultSource });
    res.json({ err: false, result });
  } catch (e) {
    logger.error(e);
    res.json({ err: true, err_msg: 'CUSTOMER_UPDATE_ERROR', result: e.message });
  }
});


module.exports = router;
