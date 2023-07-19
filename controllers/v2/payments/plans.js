const express = require('express');
const logger = require('../../../services/logger');
const paymentPlanService = require('../../../services/payment/plan');

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
    const result = await paymentPlanService.list({ startingAfter, limit });
    res.json({ err: false, result });
  } catch (e) {
    logger.error(e);
    res.json({ err: true, err_msg: 'PAYMENT_PLAN_LIST_ERROR', result: e.message });
  }
});


/**
 * URL: /v2/payments/plans
 * METHOD: POST
 * Description: Create payment plan for product
 */

router.post('/', async (req, res) => {
  req.checkBody({
    nickname: {
      notEmpty: true,
      isString: true
    },
    interval: {
      notEmpty: true,
      isString: true
    },
    productId: {
      notEmpty: true,
      isString: true
    },
    active: {
      notEmpty: true,
      isBoolean: true
    },
    tiers: {
      notEmpty: true,
      isArray: true
    }
  });
  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: 'VALIDATION_ERROR', result: errors });
  }
  const { interval, nickname, active, tiers, productId } = req.body;
  const planInterval = paymentPlanService.getPlanIntervals(interval);
  if (!planInterval) {
    return res.json({ err: true, err_msg: 'INVALID_PLAN_INTERVAL' });
  }
  try {
    const result = await paymentPlanService
      .create({ productId, nickname, active, tiers, interval: planInterval });
    res.json({ err: false, result });
  } catch (e) {
    // logger.error(e);
    res.json({ err: true, err_msg: 'PAYMENT_PLAN_CREATE_ERROR', result: e.message });
  }
});


/**
 * URL: /v2/payments/plans/:planId
 * METHOD: GET
 * Description: Get payment plan
 */

router.get('/:planId', async (req, res) => {
  req.checkParams({
    planId: {
      notEmpty: true,
      isString: true
    }
  });
  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: 'VALIDATION_ERROR', result: errors });
  }

  const { planId } = req.params;

  try {
    const result = await paymentPlanService.get(planId);
    res.json({ err: false, result });
  } catch (e) {
    logger.error(e);
    res.json({ err: true, err_msg: 'PAYMENT_PLAN_GET_ERROR', result: e.message });
  }
});

/**
 * URL: /v2/payments/plans/:planId
 * METHOD: PUT
 * Description: Update payment plan
 */

router.put('/:planId', async (req, res) => {
  req.checkParams({
    planId: {
      notEmpty: true,
      isString: true
    }
  });
  req.checkBody({
    nickname: {
      notEmpty: true,
      isString: true
    },
    active: {
      notEmpty: true,
      isBoolean: true
    },
    productId: {
      optional: true,
      isString: true
    }
  });
  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: 'VALIDATION_ERROR', result: errors });
  }

  const { planId } = req.params;
  const { productId, nickname, active } = req.body;

  try {
    const result = await paymentPlanService
      .update(planId, { productId, nickname, active });
    res.json({ err: false, result });
  } catch (e) {
    logger.error(e);
    res.json({ err: true, err_msg: 'PAYMENT_PLAN_UPDATE_ERROR', result: e.message });
  }
});


/**
 * URL: /v2/payments/plans/:planId
 * METHOD: GET
 * Description: Delete plan
 */

router.delete('/:planId', async (req, res) => {
  req.checkParams({
    planId: {
      notEmpty: true,
      isString: true
    }
  });
  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: 'VALIDATION_ERROR', result: errors });
  }

  const { planId } = req.params;


  try {
    const result = await paymentPlanService
      .delete(planId);
    res.json({ err: false, result });
  } catch (e) {
    logger.error(e);
    res.json({ err: true, err_msg: 'PAYMENT_PLAN_DELETE_ERROR', result: e.message });
  }
});


module.exports = router;
