const express = require('express');
const utils = require('../../helpers/utils');
const callService = require('../../services/call');
const logger = require('../../services/logger');

const router = express.Router();


/*
 * URL: /v3/calls
 * METHOD: GET
 * Description: Get call history
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
    offset: {
      notEmpty: true,
      isNumber: true
    },
    limit: {
      notEmpty: true,
      isNumber: true,
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
    bundleType: {
      optional: true,
      isString: true
    },
    number: {
      optional: true,
      isString: true
    },
    statusCode: {
      optional: true,
      isNumber: true
    },
    userGroupId: {
      optional: true,
      isNumber: true
    },
    network: {
      optional: true,
      isString: true
    },
    sipAddress: {
      optional: true,
      isString: true
    },
    voipModuleAddress: {
      optional: true,
      isString: true
    }
  });

  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: 'VALIDATION_ERROR', result: errors });
  }


  // required fields
  const customerId = req.customerId;
  const startDate = utils.getStartDateInt(req.query.startDate);
  const endDate = utils.getEndDateInt(req.query.endDate);
  const limit = req.query.limit;
  const offset = req.query.offset;

  // not required fields

  const currency = req.query.currency || 'USD';
  const callType = req.query.callType || 'ALL';
  const bundleType = req.query.bundleType || 'ALL';
  const fromCountry = req.query.fromCountry || '';
  const toCountry = req.query.toCountry || '';
  const number = req.query.username;
  const userGroupId = req.query.userGroupId;
  const network = req.query.network;
  const statusCode = req.query.statusCode;
  const voipModuleAddress = req.query.voipModuleAddress;
  const sipAddress = req.query.sipAddress;

  const params = {
    customerId,
    startDate,
    endDate,
    limit,
    offset,
    fromCountry,
    toCountry,
    currency,
    callType,
    bundleType,
    number,
    userGroupId,
    network,
    statusCode,
    voipModuleAddress,
    sipAddress
  };


  try {
    const result = await callService.list.calls(params);
    res.json({ err: false, result });
  } catch (e) {
    logger.error(e);
    res.json({ err: true, err_msg: e.message });
  }
});

/*
 * URL: /v3/calls/count
 * METHOD: GET
 * Description: Get calls count
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
    bundleType: {
      optional: true,
      isString: true
    },
    number: {
      optional: true,
      isString: true
    },
    statusCode: {
      optional: true,
      isNumber: true
    },
    userGroupId: {
      optional: true,
      isNumber: true
    },
    network: {
      optional: true,
      isString: true
    },
    sipAddress: {
      optional: true,
      isString: true
    },
    voipModuleAddress: {
      optional: true,
      isString: true
    }
  });

  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: 'VALIDATION_ERROR', result: errors });
  }

  // required fields
  const customerId = req.customerId;
  const startDate = utils.getStartDateInt(req.query.startDate);
  const endDate = utils.getEndDateInt(req.query.endDate);

  // not required fields

  const currency = req.query.currency || 'USD';
  const callType = req.query.callType || 'ALL';
  const bundleType = req.query.bundleType || 'ALL';
  const fromCountry = req.query.fromCountry || '';
  const toCountry = req.query.toCountry || '';
  const number = req.query.username;
  const userGroupId = req.query.userGroupId;
  const network = req.query.network;
  const statusCode = req.query.statusCode;
  const voipModuleAddress = req.query.voipModuleAddress;
  const sipAddress = req.query.sipAddress;

  const params = {
    customerId,
    startDate,
    endDate,
    fromCountry,
    toCountry,
    currency,
    callType,
    bundleType,
    number,
    userGroupId,
    network,
    statusCode,
    voipModuleAddress,
    sipAddress
  };

  try {
    const result = await callService.count.calls(params);
    res.json({ err: false, result });
  } catch (e) {
    logger.error(e);
    res.json({ err: true, err_msg: e.message || e });
  }
});

module.exports = router;
