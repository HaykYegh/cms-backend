const express = require('express');
const logger = require('../../../services/logger');
const paymentHistoryService = require('../../../services/payment/history');
const { PAYMENTS: { HISTORY_TYPES } } = require('../../../helpers/constants');

const router = express.Router();

/**
 * URL: /v2/payments/history
 * METHOD: GET
 * Description Get payment history
 */

router.get('/history', async (req, res) => {
  req.checkQuery({
    year: {
      notEmpty: true,
      isNumber: true
    },
    month: {
      optional: true,
      isNumber: true
    }
  });
  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: 'VALIDATION_ERROR', result: errors });
  }

  const customerId = req.customerId;
  const { year, month } = req.query;

  try {
    const params = {
      customerId,
      year,
      month,
      searchType: month ? HISTORY_TYPES.MONTHLY : HISTORY_TYPES.YEARLY
    };
    const result = await paymentHistoryService.get.history(null, params);

    return res.json({ err: false, result });
  } catch (e) {
    logger.error(e);
    return res.json({ err: true, result: e.message });
  }
});

module.exports = router;
