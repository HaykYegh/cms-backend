const express = require('express');
const logger = require('../../../services/logger');
const userService = require('../../../services/user');
const { generateEmailNumber } = require('../../../helpers/utils');

const router = express.Router();


/**
 * URL: /v2/users/not-verified
 * METHOD: GET
 * Description: Get not verified users
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
    startDate: {
      optional: true,
      isDate: true
    },
    endDate: {
      optional: true,
      isDate: true
    },
    regionCode: {
      optional: true,
      isString: true
    },
    platformId: {
      optional: true,
      isNumber: true
    },
    mobile: {
      optional: true,
      isString: true
    },
    email: {
      optional: true,
      isString: true
    }
  });

  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: 'VALIDATION_ERROR', result: errors });
  }

  const customerId = req.customerId;
  const prefix = req.administrator.customer.prefix;

  const limit = parseInt(req.query.limit, 10) || 50;
  const offset = (req.query.offset) * limit;

  const queryParams = {
    customerId,
    prefix,
    offset,
    limit,
    startDate: req.query.startDate || null,
    endDate: req.query.endDate || null,
    regionCode: req.query.regionCode || null,
    platformId: req.query.platformId || null,
    username: req.query.mobile ? (prefix + req.query.mobile) : null,
    email: req.query.email || null
  };
  try {
    const result = await userService.notVerified.getAll.records(queryParams);
    res.json({ err: false, result: { records: result, count: 0 } });
  } catch (e) {
    global.log.error(e);
    res.json({ err: true, err_msg: e.message, result: e });
  }
});


/**
 * URL: /v2/users/not-verified/count
 * METHOD: GET
 * Description: Get not verified users count
 */

router.get('/count', async (req, res) => {
  req.checkQuery({
    startDate: {
      optional: true,
      isDate: true
    },
    endDate: {
      optional: true,
      isDate: true
    },
    regionCode: {
      optional: true,
      isString: true
    },
    platformId: {
      optional: true,
      isNumber: true
    },
    mobile: {
      optional: true,
      isString: true
    },
    email: {
      optional: true,
      isString: true
    }
  });

  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: 'VALIDATION_ERROR', result: errors });
  }

  const customerId = req.customerId;
  const prefix = req.administrator.customer.prefix;


  const queryParams = {
    customerId,
    startDate: req.query.startDate || null,
    endDate: req.query.endDate || null,
    regionCode: req.query.regionCode || null,
    platformId: req.query.platformId || null,
    username: req.query.mobile ? (prefix + req.query.mobile) : null,
    email: req.query.email || null
  };
  try {
    const result = await userService.notVerified.getAll.count(queryParams);
    res.json({ err: false, result });
  } catch (e) {
    global.log.error(e);
    res.json({ err: true, err_msg: e.message, result: e });
  }
});


/**
 * URL: /v2/users
 * METHOD: POST
 * Description: Create user with username and password
 */

router.post('/', async (req, res) => {
  req.checkBody({
    phoneNumber: {
      optional: true,
      isNumber: true
    },
    email: {
      optional: true,
      isString: true
    },
    password: {
      isString: true,
      notEmpty: true,
    },
    regionCode: {
      isString: true,
      notEmpty: true,
    }
  });
  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: 'VALIDATION_ERROR', result: errors });
  }
  const customerId = req.customerId;
  const prefix = req.administrator.customer.prefix;


  try {
    const email = req.body.email;
    const phoneNumber = req.body.email ? generateEmailNumber() : req.body.phoneNumber;
    const password = req.body.password;
    const regionCode = req.body.regionCode;

    const result = await userService.users.create({
      customerId,
      prefix,
      phoneNumber,
      email,
      password,
      regionCode });
    res.json({ err: false, result });
  } catch (e) {
    logger.error(e);
    res.json({ err: true, err_msg: e.message });
  }
});


module.exports = router;
