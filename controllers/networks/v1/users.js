const express = require('express');
const logger = require('../../../services/logger');
const userService = require('../../../services/user');

const router = express.Router();


/**
 * URL: /networks/v1/users/search
 * METHOD: GET
 * Description: Search user by pattern
 */

router.get('/search', async (req, res) => {
  req.checkQuery({
    q: {
      notEmpty: true,
      isString: true
    }
  });
  req.checkQuery({
    limit: {
      optional: true,
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
  const customerId = req.customerId;
  const networkId = req.networkId;
  const prefix = req.admin.customer.prefix;

  const q = req.query.q;
  const limit = parseInt(req.query.limit, 10) || 10;
  const offset = (req.query.offset) * limit;

  logger.info({ customerId, prefix, q, limit, offset });

  try {
    const result = await userService.search.user(null,
      { customerId, prefix, networkId, q, limit, offset });
    res.json({ err: false, result });
  } catch (e) {
    logger.error(e);
    res.json({ err: true, err_msg: e.message });
  }
});

/**
 * URL: /networks/v1/users
 * METHOD: GET
 * Description: GET users records according filter
 */

router.get('/', async (req, res) => {
  req.checkQuery({
    offset: {
      notEmpty: true,
      isNumber: true
    },
    limit: {
      optional: true,
      isNumber: true
    },
    registrationStartDate: {
      optional: true,
      isDate: true
    },
    registrationEndDate: {
      optional: true,
      isDate: true
    },
    activityStartDate: {
      optional: true,
      isDate: true
    },
    activityEndDate: {
      optional: true,
      isDate: true
    },
    countryId: {
      optional: true,
      isNumber: true
    },
    platformId: {
      optional: true,
      isNumber: true
    },
    userId: {
      optional: true,
      isNumber: true
    },
    callCountFrom: {
      optional: true,
      isNumber: true
    },
    callCountTo: {
      optional: true,
      isNumber: true
    },
    messageCountFrom: {
      optional: true,
      isNumber: true
    },
    messageCountTo: {
      optional: true,
      isNumber: true
    },
    durationFrom: {
      optional: true,
      isNumber: true
    },
    durationTo: {
      optional: true,
      isNumber: true
    },
  });

  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: 'VALIDATION_ERROR', result: errors });
  }

  const customerId = req.customerId;
  const prefix = req.admin.customer.prefix;
  const networkId = req.networkId;

  const limit = parseInt(req.query.limit, 10) || 50;
  const offset = (req.query.offset) * limit;

  const queryParams = {
    customerId,
    prefix,
    offset,
    limit,
    registrationStartDate: req.query.registrationStartDate || null,
    registrationEndDate: req.query.registrationEndDate || null,
    activityStartDate: req.query.activityStartDate || null,
    activityEndDate: req.query.activityEndDate || null,
    countryId: req.query.countryId || null,
    platformId: req.query.platformId || null,
    userId: req.query.userId || null,
    networkId,
    callCountFrom: req.query.callCountFrom || null,
    callCountTo: req.query.callCountTo || null,
    messageCountFrom: req.query.messageCountFrom || null,
    messageCountTo: req.query.messageCountTo || null,
    durationFrom: req.query.durationFrom || null,
    durationTo: req.query.durationTo || null,
  };
  try {
    const result = await userService.networkUsers.getAll.records(queryParams);
    res.json({ err: false, result: { records: result, count: 0 } });
  } catch (e) {
    logger.error(e);
    res.json({ err: true, err_msg: e.message, result: e });
  }
});


/**
 * URL: /networks/v2/users/count
 * METHOD: GET
 * Description: GET users count according filter
 */

router.get('/count', async (req, res) => {
  req.checkQuery({
    registrationStartDate: {
      optional: true,
      isDate: true
    },
    registrationEndDate: {
      optional: true,
      isDate: true
    },
    activityStartDate: {
      optional: true,
      isDate: true
    },
    activityEndDate: {
      optional: true,
      isDate: true
    },
    countryId: {
      optional: true,
      isNumber: true
    },
    platformId: {
      optional: true,
      isNumber: true
    },
    userId: {
      optional: true,
      isNumber: true
    },
    callCountFrom: {
      optional: true,
      isNumber: true
    },
    callCountTo: {
      optional: true,
      isNumber: true
    },
    messageCountFrom: {
      optional: true,
      isNumber: true
    },
    messageCountTo: {
      optional: true,
      isNumber: true
    },
    durationFrom: {
      optional: true,
      isNumber: true
    },
    durationTo: {
      optional: true,
      isNumber: true
    },
  });

  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: 'VALIDATION_ERROR', result: errors });
  }

  const customerId = req.customerId;
  const networkId = req.networkId;

  const queryParams = {
    customerId,
    networkId,
    registrationStartDate: req.query.registrationStartDate || null,
    registrationEndDate: req.query.registrationEndDate || null,
    activityStartDate: req.query.activityStartDate || null,
    activityEndDate: req.query.activityEndDate || null,
    countryId: req.query.countryId || null,
    platformId: req.query.platformId || null,
    userId: req.query.userId || null,
    callCountFrom: req.query.callCountFrom || null,
    callCountTo: req.query.callCountTo || null,
    messageCountFrom: req.query.messageCountFrom || null,
    messageCountTo: req.query.messageCountTo || null,
    durationFrom: req.query.durationFrom || null,
    durationTo: req.query.durationTo || null,
  };
  try {
    const result = await userService.networkUsers.getAll.count(queryParams);
    res.json({ err: false, result });
  } catch (e) {
    logger.error(e);
    res.json({ err: true, err_msg: e.message, result: e });
  }
});

module.exports = router;
