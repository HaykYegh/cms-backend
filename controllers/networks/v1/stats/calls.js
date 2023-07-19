const express = require('express');
const statsService = require('../../../../services/stats');
const logger = require('../../../../services/logger');

const router = express.Router();

/**
 * URL: /networks/v1/stats/calls
 * METHOD: GET
 * Description: Get network call stats by country
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
    },
    metricTypeId: {
      notEmpty: true,
      isNumber: true
    },
  });

  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: 'VALIDATION_ERROR', result: errors });
  }

  const { startDate, endDate, metricTypeId } = req.query;
  const customerId = req.customerId;
  const networkId = req.networkId;
  try {
    const result = await statsService
      .calls
      .getCount({ customerId, metricTypeId, networkId, startDate, endDate });
    res.json({ err: false, result });
  } catch (e) {
    logger.error(e);
    res.json({ err: true, err_msg: e.message });
  }
});


/**
 * URL: /networks/v1/stats/calls/metric-types
 * METHOD: GET
 * Description: Get call metric types
 */

router.get('/metric-types', async (req, res) => {
  try {
    const result = await statsService
      .calls
      .getMetricTypes();
    res.json({ err: false, result });
  } catch (e) {
    logger.error(e);
    res.json({ err: true, err_msg: e.message });
  }
});


/**
 * URL: /v2/stats/calls/timeline
 * METHOD: GET
 * Description: Get customer call count by date with duration
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
      .calls
      .getCountByDate({ customerId, networkId, regionCode, startDate, endDate });
    res.json({ err: false, result });
  } catch (e) {
    logger.error(e);
    res.json({ err: true, err_msg: e.message });
  }
});

module.exports = router;
