const express = require('express');
const paymentService = require('../../../services/payment');
const paymentCardService = require('../../../services/payment/card');
const paymentCustomerService = require('../../../services/payment/customer');
const logger = require('../../../services/logger');

const router = express.Router();


/**
 * URL: /v2/payments/cards
 * METHOD: GET
 * Description: Get credit cards
 */

router.get('/', async (req, res) => {
  req.checkQuery({
    offset: {
      notEmpty: true,
      isNumber: true
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
  logger.info(`query => ${JSON.stringify(query)}`);
  const customerId = query.customerId;
  const limit = parseInt(query.limit, 10);
  const offset = parseInt(req.query.offset, 10) * limit;

  try {
    const cards = await paymentCardService.list(null, { customerId, limit, offset });
    res.json({ err: false, result: cards });
  } catch (e) {
    console.error(e);
    res.json({ err: true, result: e });
  }
});


/**
 * URL: /v2/payments/cards
 * METHOD: POST
 * Description: Attach credit card
 */

router.post('/', async (req, res) => {
  req.checkBody({
    authorizedCardToken: {
      notEmpty: true,
      isObject: true
    },
    customer: {
      notEmpty: true,
      isObject: true,
    },
    isDefault: {
      optional: true,
      isBoolean: true,
    },
  });
  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: 'VALIDATION_ERROR', result: errors });
  }
  const { customer, isDefault, authorizedCardToken } = req.body;

  try {
    const stripeCustomer = await paymentCustomerService.getByCustomerId(null, {
      customerId: customer.id,
    });
    const authorizedCard = await paymentCardService.authorize({
      customerToken: stripeCustomer.token, source: authorizedCardToken.id
    });
    const result = await paymentCardService.create(null, {
      stripeCustomer, source: authorizedCard.id, isDefault, meta: authorizedCardToken,
    });
    if (isDefault) {
      await paymentCustomerService.updateStripe({
        stripeCustomerToken: stripeCustomer.token, cardToken: authorizedCard.id
      });
    }
    res.json({ err: false, result });
  } catch (e) {
    logger.info(e);
    res.json({ err: true, err_msg: 'ATTACH_ERROR', result: e });
  }
});


/**
 * URL: /v2/payments/cards/:cardId
 * METHOD: DELETE
 * Description: Remove card from cards
 */

router.delete('/:cardId', async (req, res) => {
  req.checkParams({
    cardId: {
      notEmpty: true,
      isNumber: true
    },
  });
  req.checkQuery({
    customerId: {
      notEmpty: true,
      isString: true,
    },
  });

  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: 'VALIDATION_ERROR', result: errors });
  }

  const { cardId } = req.params;
  const { customerId } = req.query;

  try {
    const deleted = await paymentService.deletePaymentCard(null, { customerId, cardId });
    res.json({ err: false, result: { deleted } });
  } catch (e) {
    console.error(e);
    res.json({ err: true, result: e });
  }
});


/**
 * URL: /v2/payments/cards/:cardId/default
 * METHOD: POST
 * Description: Make card is default
 */

router.post('/:cardId/default', async (req, res) => {
  req.checkParams({
    cardId: {
      notEmpty: true,
      isNumber: true
    },
  });
  req.checkBody({
    customerId: {
      notEmpty: true,
      isNumber: true,
    },
  });

  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: 'VALIDATION_ERROR', result: errors });
  }

  const { cardId } = req.params;
  const { customerId } = req.body;
  try {
    const defaultCard = await paymentService.setPaymentCardDefault(null, { customerId, cardId });
    res.json({ err: false, result: defaultCard });
  } catch (e) {
    console.log(e);
    res.json({ err: true, err_msg: 'UPDATE_ERROR', result: e });
  }
});
module.exports = router;
