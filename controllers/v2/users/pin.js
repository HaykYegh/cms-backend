const express = require('express');
const logger = require('../../../services/logger');
const userService = require('../../../services/user');

const router = express.Router();


/**
 * URL: /v2/users/:number/pin
 * METHOD: GET
 * Description: Get pin code according to username
 */

router.get('/:number/pin', async (req, res) => {
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

  const prefix = req.administrator.customer.prefix;
  const username = prefix + req.params.number;

  try {
    const result = await userService.attempts.getPin({ username });
    res.json({ err: false, result: { code: result } });
  } catch (e) {
    logger.error(e);
    res.json({ err: true, err_msg: e.message, result: e });
  }
});


module.exports = router;
