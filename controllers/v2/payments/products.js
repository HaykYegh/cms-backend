const express = require('express');
const logger = require('../../../services/logger');
const paymentProductService = require('../../../services/payment/product');

const router = express.Router();


/**
 * URL: /v2/payments/products
 * METHOD: GET
 * Description: Get payment products
 */

router.get('/', async (req, res) => {
  req.checkQuery({
    startingAfter: {
      optional: true,
      isString: true
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

  const query = req.query;
  const limit = parseInt(query.limit, 10);
  const { startingAfter } = query;

  try {
    const result = await paymentProductService.list({ startingAfter, limit });
    res.json({ err: false, result });
  } catch (e) {
    logger.error(e);
    res.json({ err: true, err_msg: 'PAYMENT_PRODUCT_LIST_ERROR', result: e.message });
  }
});


/**
 * URL: /v2/payments/products
 * METHOD: POST
 * Description: Create payment product
 */

router.post('/', async (req, res) => {
  req.checkBody({
    type: {
      notEmpty: true,
      isString: true
    },
    name: {
      notEmpty: true,
      isString: true
    },
    active: {
      notEmpty: true,
      isBoolean: true
    }
  });
  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: 'VALIDATION_ERROR', result: errors });
  }

  const { customerId, type, name, active } = req.body;
  const productType = paymentProductService.getProductType(type);

  if (!productType) {
    return res.json({ err: true, err_msg: 'INVALID_PRODUCT_TYPE' });
  }
  try {
    const result = await paymentProductService.create({ customerId, name, type, active });
    res.json({ err: false, result });
  } catch (e) {
    logger.error(e);
    res.json({ err: true, err_msg: 'PAYMENT_PRODUCT_CREATE_ERROR', result: e.message });
  }
});


/**
 * URL: /v2/payments/products/:productId
 * METHOD: GET
 * Description: Get payment product
 */

router.get('/:productId', async (req, res) => {
  req.checkParams({
    productId: {
      notEmpty: true,
      isString: true
    }
  });
  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: 'VALIDATION_ERROR', result: errors });
  }

  const { productId } = req.params;

  try {
    const result = await paymentProductService.get({ productId });
    res.json({ err: false, result });
  } catch (e) {
    logger.error(e);
    res.json({ err: true, err_msg: 'PAYMENT_PRODUCT_GET_ERROR', result: e.message });
  }
});

/**
 * URL: /v2/payments/products/:productId
 * METHOD: PUT
 * Description: Update payment product
 */

router.put('/:productId', async (req, res) => {
  req.checkParams({
    productId: {
      notEmpty: true,
      isString: true
    }
  });
  req.checkBody({
    name: {
      notEmpty: true,
      isString: true
    },
    active: {
      notEmpty: true,
      isBoolean: true
    }
  });
  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: 'VALIDATION_ERROR', result: errors });
  }

  const { productId } = req.params;
  const { name, active } = req.body;

  try {
    const result = await paymentProductService
      .update(productId, { name, active });
    res.json({ err: false, result });
  } catch (e) {
    logger.error(e);
    res.json({ err: true, err_msg: 'PAYMENT_PRODUCT_UPDATE_ERROR', result: e.message });
  }
});


/**
 * URL: /v2/payments/products/:productId
 * METHOD: GET
 * Description: Delete product
 */

router.delete('/:productId', async (req, res) => {
  req.checkParams({
    productId: {
      notEmpty: true,
      isString: true
    }
  });
  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: 'VALIDATION_ERROR', result: errors });
  }

  const { productId } = req.params;

  try {
    const result = await paymentProductService
      .delete(productId);
    res.json({ err: false, result });
  } catch (e) {
    logger.error(e);
    res.json({ err: true, err_msg: 'PAYMENT_PRODUCT_DELETE_ERROR', result: e.message });
  }
});

router.use('/prices', require('./prices'));


module.exports = router;
