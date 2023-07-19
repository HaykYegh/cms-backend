const express = require('express');
const paymentCardService = require('../../../../services/payment/card');
const logger = require('../../../../services/logger');

const router = express.Router();


/**
 * URL: /networks/v1/cards
 * METHOD: GET
 * Description: Get credit cards
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

  const { customerId, adminId, networkId } = req;
  const limit = parseInt(req.query.limit, 10);
  const startingAfter = req.query.startingAfter || '';

  try {
    const cards = await paymentCardService
      .list({ customerId, adminId, networkId, limit, startingAfter });
    res.json({ err: false, result: cards });
  } catch (e) {
    logger.error(e);
    res.json({ err: true, err_msg: 'CARD_LIST_ERROR', result: e.message });
  }
});


/**
 * URL: /networks/v1/cards
 * METHOD: POST
 * Description: Attach credit card
 */

router.post('/', async (req, res) => {
  req.checkBody({
    source: {
      notEmpty: true,
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

  console.log({ meta });

  try {
    const result = await paymentCardService.attach(null, {
      customerId, adminId, networkId, source, meta
    });
    res.json({ err: false, result });
  } catch (e) {
    logger.error(e);
    res.json({ err: true, err_msg: 'CARD_ATTACH_ERROR', result: e.message });
  }
});


/**
 * URL: /networks/v1/cards/:cardId
 * METHOD: GET
 * Description: Get credit card
 */

router.get('/:cardId', async (req, res) => {
  req.checkParams({
    cardId: {
      notEmpty: true,
      isString: true
    }
  });
  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: 'VALIDATION_ERROR', result: errors });
  }

  const { cardId } = req.params;
  const { customerId, adminId, networkId } = req;

  try {
    const result = await paymentCardService.get({ customerId, adminId, networkId, cardId });
    res.json({ err: false, result });
  } catch (e) {
    logger.error(e);
    res.json({ err: true, err_msg: 'CARD_GET_ERROR', result: e.message });
  }
});


/**
 * URL: /v2/payments/cards/:cardId
 * METHOD: DELETE
 * Description: Delete credit card
 */

router.delete('/:cardId', async (req, res) => {
  req.checkParams({
    cardId: {
      notEmpty: true,
      isString: true
    }
  });
  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: 'VALIDATION_ERROR', result: errors });
  }

  const { cardId } = req.params;
  const { customerId, adminId, networkId } = req;

  try {
    const result = await paymentCardService.delete({ customerId, adminId, networkId, cardId });
    res.json({ err: false, result });
  } catch (e) {
    logger.error(e);
    res.json({ err: true, err_msg: 'CARD_DELETE_ERROR', result: e.message });
  }
});


module.exports = router;
