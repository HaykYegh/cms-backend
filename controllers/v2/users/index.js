const express = require('express');
const sqlDB = require('../../../services/db');
const logger = require('../../../services/logger');
const userService = require('../../../services/user');
const customerService = require('../../../services/customers');
const { generateEmailNumber, replaceAll } = require('../../../helpers/utils');
const emailService = require('../../../services/email');
const { Client } = require('@elastic/elasticsearch');
const config = require('config');
const request = require('request');
const fs = require('fs');


const stompService = require('../../../services/stomp');

const router = express.Router();
/**
 * URL: /v2/users/search
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
  const prefix = req.administrator.customer.prefix;

  const q = req.query.q;
  const limit = parseInt(req.query.limit, 10) || 10;
  const offset = (req.query.offset) * limit;

  logger.info({ customerId, prefix, q, limit, offset });

  try {
    const result = await userService.search.user(null,
      { customerId, prefix, q, limit, offset });
    res.json({ err: false, result });
  } catch (e) {
    logger.error(e);
    res.json({ err: true, err_msg: e.message });
  }
});

/**
 * URL: /v2/users/searchByEmailOrNickname
 * METHOD: GET
 * Description: Search user by Email Or Nickname
 */

router.get('/searchByEmailOrNickname', async (req, res) => {
  req.checkQuery({
    q: {
      notEmpty: true,
      isString: true
    }
  });

  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: 'VALIDATION_ERROR', result: errors });
  }
  const customerId = req.customerId;

  const q = req.query.q;

  logger.info({ customerId, q });

  try {
    const result = await userService.search.userByEmailOrNickname(null,
      { customerId, q });

    res.json({ err: false, result });
  } catch (e) {
    logger.error(e);
    res.json({ err: true, err_msg: e.message });
  }
});


/**
 * URL: /v2/users
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
    networkId: {
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
    number: {
      optional: true,
      isNumber: true
    },
    nickname: {
      optional: true,
      isString: true
    },
    userGroupId: {
      optional: true,
      isNumber: true
    },
    channel: {
      optional: true,
      isString: true
    },
  });

  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: 'VALIDATION_ERROR', result: errors });
  }

  const customerId = req.customerId;
  const { prefix } = customerService.get.customerId(customerId);

  const limit = parseInt(req.query.limit, 10) || 50;
  const offset = (req.query.offset) * limit;

  const queryParams = {
    customerId,
    offset,
    limit,
    registrationStartDate: req.query.registrationStartDate || null,
    registrationEndDate: req.query.registrationEndDate || null,
    activityStartDate: req.query.activityStartDate || null,
    activityEndDate: req.query.activityEndDate || null,
    countryId: req.query.countryId || null,
    platformId: req.query.platformId || null,
    userId: req.query.userId || null,
    networkId: req.query.networkId || null,
    callCountFrom: req.query.callCountFrom || null,
    callCountTo: req.query.callCountTo || null,
    messageCountFrom: req.query.messageCountFrom || null,
    messageCountTo: req.query.messageCountTo || null,
    durationFrom: req.query.durationFrom || null,
    durationTo: req.query.durationTo || null,
    number: req.query.number ? prefix + req.query.number : null,
    nickname: req.query.nickname || null,
    email: req.query.email || null,
    userGroupId: req.query.userGroupId || null,
    nickEmail: req.query.nickEmail || null,
    channelName: req.query.channelName || null,
    byDate: req.query.byDate || null,
    subscribed: req.query.subscribed || null,
  };
  try {
    const result = await userService.users.getAll.records(queryParams);
    res.json({ err: false, result: { records: result, count: 0 } });
  } catch (e) {
    logger.error(e);
    res.json({ err: true, err_msg: e.message, result: e });
  }
});


/**
 * URL: /v2/users/count
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
    networkId: {
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
    number: {
      optional: true,
      isNumber: true
    },
    email: {
      optional: true,
      isString: true
    },
    userGroupId: {
      optional: true,
      isNumber: true
    },
    channelName: {
      optional: true,
      isString: true
    },
    nickname: {
      optional: true,
      isString: true
    }
  });

  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: 'VALIDATION_ERROR', result: errors });
  }

  const customerId = req.customerId;
  const { prefix } = customerService.get.customerId(customerId);

  const queryParams = {
    customerId,
    registrationStartDate: req.query.registrationStartDate || null,
    registrationEndDate: req.query.registrationEndDate || null,
    activityStartDate: req.query.activityStartDate || null,
    activityEndDate: req.query.activityEndDate || null,
    countryId: req.query.countryId || null,
    platformId: req.query.platformId || null,
    userId: req.query.userId || null,
    networkId: req.query.networkId || null,
    callCountFrom: req.query.callCountFrom || null,
    callCountTo: req.query.callCountTo || null,
    messageCountFrom: req.query.messageCountFrom || null,
    messageCountTo: req.query.messageCountTo || null,
    durationFrom: req.query.durationFrom || null,
    durationTo: req.query.durationTo || null,
    number: req.query.number ? prefix + req.query.number : null,
    email: req.query.email || null,
    userGroupId: req.query.userGroupId || null,
    channelName: req.query.channelName || null,
    nickname: req.query.nickname || null,
    nickEmail: req.query.nickEmail || null,
    byDate: req.query.byDate || null,
    subscribed: req.query.subscribed || null,
  };
  try {
    const result = await userService.users.getAll.count(queryParams);
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
    nickname: {
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
    let phoneNumber = '';
    const nickname = req.body.nickname;
    const bodyPhoneNumber = req.body.phoneNumber ? req.body.phoneCode ? (req.body.phoneCode + req.body.phoneNumber.replace('+', '')) : req.body.phoneNumber.replace('+', '') : '';
    if (prefix !== 'ns') {
      phoneNumber = req.body.email || req.body.nickname ? generateEmailNumber() : bodyPhoneNumber;
    } else if (bodyPhoneNumber.toString().length === 4) {
      phoneNumber = `87000000${bodyPhoneNumber}`;
      const sqlResult = await sqlDB.query('sql/users/get-user.sql', [customerId, prefix + phoneNumber]);
      if (sqlResult.rows[0]) {
        return res.json({ err: true, err_msg: 'USER_EXIST', result: errors });
      }
    } else {
      return res.json({ err: true, err_msg: 'NUMBER_INVALID', result: errors });
    }
    const password = req.body.password;
    const regionCode = req.body.regionCode;

    const result = await userService.users.create({
      customerId,
      prefix,
      phoneNumber,
      email,
      nickname,
      password,
      regionCode
    });

    const mqObject = {
      type: 'PRE_CREATE',
      username: result.username,
      regionCode: result.country.regionCode,
      userId: result.userId,
      deviceId: -1,
      platformId: 5,
      customerId: result.customer.customerId,
      isEmail: !!req.body.email,
      createdDate: Date.now()
    };

    if (nickname) {
      const index = prefix === 'el' || prefix === 'sc' ? 'profile' : `profile_${prefix}`;
      const elasticSearchHostConfigs = config.get('elasticSearchConfigs');
      const elasticSearchHost = elasticSearchHostConfigs[prefix];

      const number = result.username.substring(2);
      const userObject = {
        number,
        nickname,
        createdat: Date.now()
      };

      if (elasticSearchHost) {
        const client = new Client({ node: elasticSearchHost });
        await client.index({
          id: result.userId,
          index,
          body: userObject
        });
      }
    }

    await stompService.sendQueueMessage('USER_USAGE_HOOK', mqObject);

    res.json({ err: false, result });
  } catch (e) {
    logger.error(e);
    res.json({ err: true, err_msg: e.message });
  }
});

/**
 * URL: /v2/users/precreate
 * METHOD: POST
 * Description: Precreate a user
 */

router.post('/precreate', async (req, res) => {
  req.checkBody({
    email: {
      isString: true,
      notEmpty: true,
    },
    regionCode: {
      isString: true,
      notEmpty: true,
    },
    businessType: {
      isString: true,
      notEmpty: true,
    },
    contacts: {
      isArray: true,
      optional: true
    }
  });
  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: 'VALIDATION_ERROR', result: errors });
  }

  try {
    const prefix = req.administrator.customer.prefix;
    const requestUrl = `${config.get('services.host')}/zangiServices/v3/auth/precreate/${prefix}`;
    const email = req.body.email;
    const regionCode = req.body.regionCode;
    const businessType = req.body.businessType;
    const contacts = req.body.contacts || null;
    const queryString = {
      email,
      regionCode,
      client_type: businessType,
      contacts,
    };
    request.get(requestUrl, {
      qs: queryString,
      rejectUnauthorized: false,
    }, async (err, httpResponse, result) => {
      if (err) {
        global.log.error(err);
        return res.json({ err: true, err_msg: 'SERVICES_ZANGI_NETWORK_ERROR' });
      }

      let link;
      try {
        link = JSON.parse(result);
      } catch (e) {
        global.log.error(e);
        global.log.error(result);
        return res.json({ err: true, err_msg: 'ZANGI_SERVICE_ERROR', result });
      }
      if (link.status === 'FAILED') {
        return res.json({ err: true, err_msg: link.message });
      }

      const templateId = emailService.CONSTANTS.ZANGI_FOR_BUSINESS_NEW_ACCOUNT;
      const emailTemplate = await emailService.get.one(null, { templateId });
      const to = email;
      const name = req.administrator.customer.name;
      const subject = replaceAll(emailTemplate.subject, {
        '{name}': name,
      });
      const message = replaceAll(emailTemplate.content, {
        '{link}': link.body,
        '{name}': name
      });

      await emailService.sendMail(prefix)({ to, subject, message });
      res.json({ err: false, result: { successful: true } });
    });
  } catch (e) {
    logger.error(e);
    res.json({ err: true, err_msg: e.message });
  }
});

/**
 * URL: /v2/users/:userId
 * METHOD: PUT
 * Description: Edit user password
 */

router.put('/:userId', async (req, res) => {
  req.checkParams({
    userId: {
      isNumber: true
    }
  });
  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: 'VALIDATION_ERROR', result: errors });
  }
  const customerId = req.customerId;
  const newPassword = req.body.newPassword;
  const currentPassword = req.body.currentPassword;

  const userId = parseInt(req.params.userId, 10);

  try {
    const sqlResult = await sqlDB.query('sql/users/check-user-password.sql', [
      customerId,
      userId,
      currentPassword
    ]);
    const result = sqlResult.rows[0];
    if (result) {
      await userService.edit.user({ userId, newPassword });
      res.json({ err: false, result: { edited: true } });
    } else {
      res.json({ err: true, message: 'Current password is false' });
    }
  } catch (e) {
    logger.error(e);
    res.json({ err: true, err_msg: 'SERVER_ERROR' });
  }
});

/**
 * URL: /v2/users/:userId
 * METHOD: DELETE
 * Description: Delete user
 */

router.delete('/:userId', async (req, res) => {
  req.checkParams({
    userId: {
      isNumber: true
    }
  });
  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: 'VALIDATION_ERROR', result: errors });
  }
  const customerId = req.customerId;

  const userId = parseInt(req.params.userId, 10);
  const { prefix } = customerService.get.customerId(customerId);

  try {
    await userService.delete.user({ customerId, prefix, userId });
    res.json({ err: false, result: { deleted: true } });
  } catch (e) {
    logger.error(e);
    res.json({ err: true, err_msg: 'SERVER_ERROR' });
  }
});


router.use('/not-verified', require('./notVerified'));
router.use('/pre-users', require('./pre-users'));
router.use('/', require('./attempts'));
router.use('/', require('./pin'));
router.use('/', require('./userGroups'));

module.exports = router;


// /v4/networks
