const express = require('express');
const utils = require('../../../helpers/utils');
const callService = require('../../../services/call');
const logger = require('../../../services/logger');

const router = express.Router();


/*
 * URL: /networks/v1/call-history
 * METHOD: GET
 * Description: Get call history
 */
router.get('/', async (req, res) => {
  req.checkQuery({
    offset: {
      notEmpty: true,
      isNumber: true
    },
    startDate: {
      notEmpty: true,
      isDate: true
    },
    endDate: {
      notEmpty: true,
      isDate: true
    },
    fromCountry: {
      optional: true,
      isString: true
    },
    toCountry: {
      optional: true,
      isString: true
    },
    currency: {
      optional: true,
      isString: true
    },
    limit: {
      optional: true,
      isNumber: true,
    },
    callType: {
      optional: true,
      isString: true
    },
    username: {
      optional: true,
      isString: true
    }
  });

  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: 'VALIDATION_ERROR', result: errors });
  }

  const prefix = req.admin.customer.prefix;
  const offset = req.query.offset;
  const networkNickName = req.network.nickname;

  const startDate = utils.getStartDateInt(req.query.startDate);
  const endDate = utils.getEndDateInt(req.query.endDate);
  const fromCountry = req.query.fromCountry;
  const toCountry = req.query.toCountry;
  const currency = req.query.currency || 'USD';
  const limit = req.query.limit || 20;
  const callType = req.query.callType || 'OUTGOING';
  const username = req.query.username ? (prefix + req.query.username) : '';


  const params = {
    prefix,
    offset,
    networkNickName,
    startDate,
    endDate,
    fromCountry,
    toCountry,
    currency,
    limit,
    callType,
    username
  };

  logger.info(params);

  try {
    const result = await callService.call.records(params);
    res.json({ err: false, result });
  } catch (e) {
    logger.error(e);
    res.json({ err: true, err_msg: e.message || e });
  }
});

/*
 * URL: /networks/v1/call-history/count
 * METHOD: GET
 * Description: Get call history
 */
router.get('/count', async (req, res) => {
  req.checkQuery({
    startDate: {
      notEmpty: true,
      isDate: true
    },
    endDate: {
      notEmpty: true,
      isDate: true
    },
    fromCountry: {
      optional: true,
      isString: true
    },
    toCountry: {
      optional: true,
      isString: true
    },
    currency: {
      optional: true,
      isString: true
    },
    callType: {
      optional: true,
      isString: true
    },
    username: {
      optional: true,
      isString: true
    }
  });

  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: 'VALIDATION_ERROR', result: errors });
  }

  const prefix = req.admin.customer.prefix;
  const networkNickName = req.network.nickname;

  const startDate = utils.getStartDateInt(req.query.startDate);
  const endDate = utils.getEndDateInt(req.query.endDate);
  const fromCountry = req.query.fromCountry;
  const toCountry = req.query.toCountry;
  const currency = req.query.currency || 'USD';
  const callType = req.query.callType || 'OUTGOING';
  const username = req.query.username ? (prefix + req.query.username) : '';

  const params = {
    prefix,
    networkNickName,
    startDate,
    endDate,
    fromCountry,
    toCountry,
    currency,
    callType,
    username
  };
  try {
    const result = await callService.call.count(params);
    res.json({ err: false, result });
  } catch (e) {
    logger.error(e);
    res.json({ err: true, err_msg: e.message || e });
  }
});

module.exports = router;
