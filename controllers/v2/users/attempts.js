const express = require('express');
const logger = require('../../../services/logger');
const userService = require('../../../services/user');

const router = express.Router();


/**
 * URL: /v2/users/:number/attempts
 * METHOD: GET
 * Description: Get user login attempts
 */

router.get('/:number/attempts', async (req, res) => {
  req.checkQuery({
    offset: {
      notEmpty: true,
      isNumber: true
    },
    limit: {
      optional: true,
      isNumber: true
    }
  });
  req.checkParams({
    number: {
      notEmpty: true,
      isNumber: true
    }
  });

  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: 'VALIDATION_ERROR', result: errors });
  }

  const customerId = req.customerId;
  const prefix = req.administrator.customer.prefix;

  const limit = parseInt(req.query.limit, 10) || 50;
  const offset = (req.query.offset) * limit;

  const username = prefix + req.params.number;


  const queryParams = {
    customerId,
    username,
    prefix,
    offset,
    limit
  };


  try {
    const result = await userService.attempts.getAll.records(null, queryParams);
    res.json({ err: false, result: { records: result } });
  } catch (e) {
    logger.error(e);
    res.json({ err: true, err_msg: e.message, result: e });
  }
});

/**
 * URL: /v2/users/:number/attempts/count
 * METHOD: GET
 * Description: Get user login attempts count
 */

router.get('/:number/attempts/count', async (req, res) => {
  req.checkParams({
    number: {
      notEmpty: true,
      isNumber: true
    },
    isDailyRequested: {
      optional: true,
      isBoolean: true
    }
  });

  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: 'VALIDATION_ERROR', result: errors });
  }

  const customerId = req.customerId;
  const prefix = req.administrator.customer.prefix;
  const username = prefix + req.params.number;


  const isDailyRequested = req.query.isDailyRequested === 'true';


  try {
    if (isDailyRequested) {
      const result = await userService.attempts.count.daily({ customerId, username });
      return res.json({ err: false, result });
    }

    const result = await userService.attempts.count.total(null, { customerId, username });
    res.json({ err: false, result });
  } catch (e) {
    logger.error(e);
    res.json({ err: true, err_msg: e.message, result: e });
  }
});


/**
 * URL: /v2/users/:number/attempts
 * METHOD: DELETE
 * Description: Reset user attempts daily or all time by user phone number
 */

router.delete('/:number/attempts', async (req, res) => {
  req.checkParams({
    number: {
      notEmpty: true,
      isNumber: true
    }
  });
  req.checkQuery({
    resetType: {
      notEmpty: true,
      isString: true
    }
  });
  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: 'VALIDATION_ERROR', result: errors });
  }

  const customerId = req.customerId;
  const prefix = req.administrator.customer.prefix;

  const resetType = req.query.resetType.toUpperCase();
  const username = prefix + req.params.number;

  const resetRequest = resetType === 'TOTAL' ?
    userService.attempts.reset.total :
    userService.attempts.reset.daily;

  try {
    const result = await resetRequest.call(null, null, { customerId, username });
    res.json({ err: false, result });
  } catch (e) {
    logger.error(e);
    res.json({ err: true, err_msg: e.message, result: e });
  }
});

module.exports = router;
