const express = require('express');
const metricService = require('../../services/metrics');
const logger = require('../../services/logger');

const router = express.Router();

/**
 * URL: /v2/metrics
 * METHOD: GET
 * Description: GET metric values
 */

router.get('/', (req, res) => {
  req.checkQuery({
    startDate: {
      notEmpty: true,
      isDate: true
    },
    endDate: {
      notEmpty: true,
      isDate: true
    },
    metricType: {
      notEmpty: true,
      isMetricType: true
    }
  });
  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: errors }).send();
  }

  const customerId = req.customerId;
  const startDate = req.query.startDate;
  const endDate = req.query.endDate;
  const metricTypeId = metricService.metricTypes.get(req.query.metricType, true);
  const metricType = metricService.metricTypes.get(req.query.metricType);
  const metricContextType = metricType.metricContextTypes[req.query.metricContextType];
  const metricContextTypeId = metricContextType ? metricContextType.metricContextTypeId : null;

  global.sql.run('get-metrics', [customerId, startDate, endDate, metricTypeId, metricContextTypeId], (err, metrics) => {
    if (err) {
      global.log.error(err);
      return res.status(200).json({ err: true, err_msg: 'DB_ERROR' }).send();
    }
    return res.status(200).json({ err: false, result: metrics }).send();
  });
});

/**
 * URL: /v2/metrics
 * METHOD: GET
 * Description: GET metrics
 */

router.get('/values', async (req, res) => {
  req.checkQuery({
    startDate: {
      notEmpty: true,
      isDate: true
    },
    endDate: {
      notEmpty: true,
      isDate: true
    },
    metricType: {
      notEmpty: true,
      isMetricType: true
    },
    metricContextType: {
      notEmpty: true,
      isString: true
    },
    regionCode: {
      notEmpty: true,
      isString: true
    },
    limit: {
      notEmpty: true,
      isNumber: true
    },
    offset: {
      notEmpty: true,
      isNumber: true
    }
  });
  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: 'VALIDATION_ERROR', result: errors });
  }

  const {
    startDate, endDate, metricType,
    metricContextType, regionCode, limit, offset
  } = req.query;

  const customerId = req.customerId;
  const metricTypeId = metricService.metricTypes.get(metricType, true);
  const metricContextTypeId = metricService
    .metricTypes
    .get(metricType)
    .metricContextTypes[metricContextType].metricContextTypeId || null;

  const metricParams = {
    customerId,
    startDate,
    endDate,
    regionCode,
    metricTypeId,
    metricContextTypeId,
    limit,
    offset
  };
  logger.info(metricParams);
  try {
    const metricValues = await metricService.getMetricValues(metricParams);
    logger.info(metricValues);
    res.json({ err: false, result: metricValues });
  } catch (e) {
    logger.error(e);
    res.json({ err: true, err_msg: 'DB_ERROR' });
  }
});


/**
 * URL: /v2/metrics/countries
 * METHOD: GET
 * Description: GET metrics by countries
 */

router.get('/countries', async (req, res) => {
  req.checkQuery({
    startDate: {
      notEmpty: true,
      isDate: true
    },
    endDate: {
      notEmpty: true,
      isDate: true
    },
    metricType: {
      notEmpty: true,
      isMetricType: true
    },
    metricContextType: {
      optional: true,
      isString: true
    },
    hasChart: {
      optional: true,
      isBoolean: true
    },
  });
  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: 'VALIDATION_ERROR', result: errors });
  }

  try {
    const { startDate, endDate, metricType } = req.query;
    const customerId = req.customerId;
    const metricContextType = req.query.metricContextType || null;
    const hasChart = req.query.hasChart || null;
    const metricTypeId = metricService.metricTypes.get(metricType, true);

    const metricContextTypeId = metricContextType && metricContextType !== 'ALL' ? metricService
      .metricTypes
      .get(metricType)
      .metricContextTypes[metricContextType].metricContextTypeId : null;

    const metricParams = {
      customerId,
      metricTypeId,
      metricContextTypeId,
      startDate,
      endDate,
    };
    logger.info(metricParams);

    const metricValuePromises = [
      metricService.countries.getCountryMetrics(metricParams)
    ];

    if (hasChart) {
      metricValuePromises.push(
        metricService.countries.getChartValuesCountryMetrics(metricParams)
      );
    }


    try {
      const metricValues = await Promise.all(metricValuePromises);
      const result = { values: metricValues[0] };
      if (hasChart) {
        result.chartValues = metricValues[1];
      }
      res.json({ err: false, result });
    } catch (e) {
      logger.error(e);
      res.json({ err: true, err_msg: 'DB_ERROR' });
    }
  } catch (e) {
    logger.error(e);
    res.json({ err: true, err_msg: 'SERVER_ERROR' });
  }
});

/**
 * URL: /v2/metrics/countries/:regionId
 * METHOD: GET
 * Description: GET metrics by countries
 */

router.get('/countries/:regionId', async (req, res) => {
  req.checkQuery({
    startDate: {
      notEmpty: true,
      isDate: true
    },
    endDate: {
      notEmpty: true,
      isDate: true
    },
    metricType: {
      notEmpty: true,
      isMetricType: true
    }
  });
  req.checkParams({
    regionId: {
      notEmpty: true,
      isNumber: true
    }
  });
  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: 'VALIDATION_ERROR', result: errors });
  }

  const { startDate, endDate, metricType } = req.query;
  const { regionId } = req.params;
  const customerId = req.customerId;
  const metricTypeId = metricService.metricTypes.get(metricType, true);

  const metricParams = {
    customerId,
    startDate,
    endDate,
    metricTypeId,
    regionId
  };
  logger.info(metricParams);
  try {
    const metricValues = await metricService.countries.getMetricsByCountry(metricParams);
    logger.info(metricValues);
    res.json({ err: false, result: metricValues });
  } catch (e) {
    logger.error(e);
    res.json({ err: true, err_msg: 'DB_ERROR' });
  }
});

module.exports = router;
