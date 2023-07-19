const express = require('express');
const statsService = require('../../../services/stats');
const logger = require('../../../services/logger');
const customersService = require('../../../services/customers');

const router = express.Router();


/**
 * URL: /v2/stats/users
 * METHOD: GET
 * Description: Get online users list
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

  const customerId = req.customerId;
  const limit = +req.query.limit;
  const offset = +req.query.offset * limit;


  try {
    const { prefix } = customersService.get.customerId(customerId);
    const onlineUsers = await statsService.getOnlineUsers({ prefix, offset, limit });

    res.json({ err: false, result: onlineUsers });
  } catch (e) {
    logger.error(e);
    res.json({ err: true, err_msg: e.message });
  }
});


/**
 * URL: /v2/stats/users/countries
 * METHOD: GET
 * Description: Get customer user stats by country
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
    }
  });

  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: 'VALIDATION_ERROR', result: errors });
  }

  const { startDate, endDate } = req.query;
  const customerId = req.customerId;
  try {
    const result = await statsService
      .users
      .countryCounts({ customerId, startDate, endDate });
    res.json({ err: false, result });
  } catch (e) {
    logger.error(e);
    res.json({ err: true, err_msg: e.message });
  }
});

/**
 * URL: /v2/stats/users/overview
 * METHOD: GET
 * Description: Get customer users registration overview
 */

router.get('/overview', async (req, res) => {
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
    }
  });

  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: 'VALIDATION_ERROR', result: errors });
  }

  const { startDate, endDate, regionCode = null } = req.query;
  const customerId = req.customerId;


  try {
    const result = await statsService
      .users
      .overview({ customerId, startDate, endDate, regionCode });
    res.json({ err: false, result });
  } catch (e) {
    logger.error(e);
    res.json({ err: true, err_msg: e.message });
  }
});
/**
 * URL: /v2/stats/users/timeline
 * METHOD: GET
 * Description: Get customer registered users count by date
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
    }
  });

  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: 'VALIDATION_ERROR', result: errors });
  }

  const { startDate, endDate, regionCode = null } = req.query;
  const customerId = req.customerId;

  try {
    const result = await statsService
      .users
      .countsByDate({ customerId, startDate, endDate, regionCode });
    res.json({ err: false, result });
  } catch (e) {
    logger.error(e);
    res.json({ err: true, err_msg: e.message });
  }
});


/**
 * URL: /v2/stats/users/presences/count
 * METHOD: GET
 * Description: Get active users count by date range
 */

router.get('/presences/count', async (req, res) => {
  req.checkQuery({
    startDate: {
      notEmpty: true,
      isDate: true
    },
    endDate: {
      notEmpty: true,
      isDate: true
    },
    networkId: {
      optional: true,
      isNumber: true
    }
  });

  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: 'VALIDATION_ERROR', result: errors });
  }

  const customerId = req.customerId;
  const networkId = req.query.networkId;


  const startDate = new Date(req.query.startDate);
  const endDate = new Date(req.query.endDate);

  const startYear = startDate.getFullYear();
  const startMonth = startDate.getMonth();

  const endYear = endDate.getFullYear();
  const endMonth = endDate.getMonth();

  const firstDay = new Date(startYear, startMonth, 1);
  const lastDay = new Date(endYear, endMonth + 1, 0);

  try {
    const result = await statsService
      .presences
      .count
      .presences({ customerId, networkId, firstDay, lastDay });

    res.json({ err: false, result });
  } catch (e) {
    logger.error(e);
    res.json({ err: true, err_msg: e.message });
  }
});


/**
 * URL: /v2/stats/users/presences
 * METHOD: GET
 * Description: Get active user numbers by date range
 */

router.get('/presences', async (req, res) => {
  req.checkQuery({
    startDate: {
      notEmpty: true,
      isDate: true
    },
    endDate: {
      notEmpty: true,
      isDate: true
    },
    offset: {
      notEmpty: true,
      isNumber: true
    },
    limit: {
      notEmpty: true,
      isNumber: true
    },
    networkId: {
      optional: true,
      isNumber: true
    }
  });
  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: 'VALIDATION_ERROR', result: errors });
  }

  const customerId = req.customerId;
  const networkId = req.query.networkId;
  const limit = +req.query.limit;
  const offset = +req.query.offset * limit;


  const startDate = new Date(req.query.startDate);
  const endDate = new Date(req.query.endDate);

  const startYear = startDate.getFullYear();
  const startMonth = startDate.getMonth();

  const endYear = endDate.getFullYear();
  const endMonth = endDate.getMonth();

  const firstDay = new Date(startYear, startMonth, 1);
  const lastDay = new Date(endYear, endMonth + 1, 0);

  try {
    const result = await statsService
      .presences
      .list
      .presences({ customerId, networkId, firstDay, lastDay, limit, offset });

    res.json({ err: false, result });
  } catch (e) {
    logger.error(e);
    res.json({ err: true, err_msg: e.message });
  }
});


module.exports = router;
