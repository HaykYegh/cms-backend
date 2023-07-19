const express = require('express');
const statsService = require('../../../../services/stats');
const logger = require('../../../../services/logger');

const router = express.Router();

/**
 * URL: /networks/v1/stats/messages
 * METHOD: GET
 * Description: Get customer message stats by country
 */

router.get('/', async (req, res) => {
  req.checkQuery({
    startDate: {
      notEmpty: true,
      isDate: true
    },
    endDate: {
      notEmpty: true,
      isDate: true
    }
  });

  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: 'VALIDATION_ERROR', result: errors });
  }

  const { startDate, endDate } = req.query;
  const customerId = req.customerId;
  const networkId = req.networkId;

  try {
    const result = await statsService
      .messages
      .getCount({ customerId, networkId, startDate, endDate });
    res.json({ err: false, result });
  } catch (e) {
    logger.error(e);
    res.json({ err: true, err_msg: e.message });
  }
});


/**
 * URL: /networks/v1/stats/messages/types/count
 * METHOD: GET
 * Description: Get customer message count by metric type (group and single)
 */

router.get('/types/count', async (req, res) => {
  req.checkQuery({
    startDate: {
      notEmpty: true,
      isDate: true
    },
    endDate: {
      notEmpty: true,
      isDate: true
    },
    regionCode: {
      optional: true,
      isString: true
    },
  });

  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: 'VALIDATION_ERROR', result: errors });
  }

  const { startDate, endDate, regionCode } = req.query;
  const customerId = req.customerId;
  const networkId = req.networkId;

  try {
    const result = await statsService
      .messages.types
      .getCount({ customerId, networkId, regionCode, startDate, endDate });
    res.json({ err: false, result });
  } catch (e) {
    logger.error(e);
    res.json({ err: true, err_msg: e.message });
  }
});


/**
 * URL: /networks/v1/stats/messages/types
 * METHOD: GET
 * Description: Get customer message count by metric type (group and single)
 */

router.get('/types', async (req, res) => {
  req.checkQuery({
    startDate: {
      notEmpty: true,
      isDate: true
    },
    endDate: {
      notEmpty: true,
      isDate: true
    },
    metricTypeId: {
      notEmpty: true,
      isNumber: true
    },
    regionCode: {
      optional: true,
      isString: true
    },
  });

  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: 'VALIDATION_ERROR', result: errors });
  }

  const { startDate, endDate, regionCode, metricTypeId } = req.query;
  const customerId = req.customerId;
  const networkId = req.networkId;

  try {
    const result = await statsService
      .messages.types
      .getRecords({ customerId, metricTypeId, networkId, regionCode, startDate, endDate });
    res.json({ err: false, result });
  } catch (e) {
    logger.error(e);
    res.json({ err: true, err_msg: e.message });
  }
});

/**
 * URL: /networks/v1/stats/messages/timeline
 * METHOD: GET
 * Description: Get customer message count by date
 */

router.get('/timeline', async (req, res) => {
  req.checkQuery({
    startDate: {
      notEmpty: true,
      isDate: true
    },
    endDate: {
      notEmpty: true,
      isDate: true
    },
    regionCode: {
      optional: true,
      isString: true
    },
  });

  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: 'VALIDATION_ERROR', result: errors });
  }

  const { startDate, endDate, regionCode } = req.query;
  const customerId = req.customerId;
  const networkId = req.networkId;

  try {
    const result = await statsService
      .messages
      .getCountByDate({ customerId, networkId, regionCode, startDate, endDate });
    res.json({ err: false, result });
  } catch (e) {
    logger.error(e);
    res.json({ err: true, err_msg: e.message });
  }
});


module.exports = router;
