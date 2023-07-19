const express = require('express');
const systemMessageService = require('../../../../services/system-message');
const logger = require('../../../../services/logger');

const router = express.Router();


/**
 * URL: /networks/v1/notifications/senders
 * METHOD: GET
 * Description: Get sender list
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
    },
    serviceId: {
      notEmpty: true,
      isNumber: true
    }
  });
  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: 'VALIDATION_ERROR', result: errors });
  }
  const customerId = req.customerId;
  const networkId = req.networkId;
  const serviceId = req.query.serviceId;
  const limit = +req.query.limit;
  const offset = +req.query.offset * limit;

  try {
    const result = await systemMessageService
      .senders
      .list
      .senders(null, { customerId, networkId, serviceId, limit, offset });
    res.json({ err: false, result });
  } catch (e) {
    logger.error(e);
    res.json({ err: true, err_msg: e.message });
  }
});

module.exports = router;
