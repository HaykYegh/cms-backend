const express = require('express');
const customerService = require('../../../services/customers');
const logger = require('../../../services/logger');

const router = express.Router();


/**
 * URL: /v2/customers
 * METHOD: GET
 * Description: Get customers
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
  const limit = +req.query.limit;
  const offset = +req.query.offset * limit;

  try {
    const result = await customerService
      .list
      .customers(null, { limit, offset });
    res.json({ err: false, result });
  } catch (e) {
    logger.error(e);
    res.json({ err: true, err_msg: e.message });
  }
});

/**
 * URL: /v2/customers/count
 * METHOD: GET
 * Description: Get customers count
 */

router.get('/count', async (req, res) => {
  try {
    const result = await customerService
      .count
      .customers();
    res.json({ err: false, result });
  } catch (e) {
    logger.error(e);
    res.json({ err: true, err_msg: e.message });
  }
});


module.exports = router;
