const express = require('express');
const _chunk = require('lodash/chunk');
const systemMessageService = require('../../../services/system-message');
const logger = require('../../../services/logger');
const userService = require('../../../services/user');
const customerService = require('../../../services/customers');

const router = express.Router();

/**
 * URL: /v1/notifications/users/count
 * METHOD: GET
 * Description: GET notification users count
 */

router.get('/users/count', async (req, res) => {
  req.checkQuery({
    platforms: {
      notEmpty: true,
      isString: true
    },
    countries: {
      notEmpty: true,
      isString: true
    },
    startsWith: {
      optional: true,
      isString: true
    }
  });
  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: 'VALIDATION_ERROR', result: errors });
  }

  const { platforms, countries } = req.query;
  const customerId = req.customerId;
  const prefix = req.admin.customer.prefix;
  const startsWith = parseInt(req.query.startsWith) !== parseInt(req.query.startsWith) ? req.query.startsWith : prefix + (req.query.startsWith || '');
  const channelId = req.channelId;

  logger.info(`platforms=${platforms}, countries=${countries},customerId=${customerId}, startsWith=${startsWith}, channelId=${channelId}`);
  try {
    const count = await systemMessageService
      .users
      .getChannelUsersCount({ customerId, platforms, countries, startsWith, channelId });
    res.json({ err: false, result: { count } });
  } catch (e) {
    logger.error(e);
    res.json({ err: true, err_msg: 'DB_ERROR' });
  }
});

/**
 * URL: /v1/notifications/users/numbers
 * METHOD: GET
 * Description: Send notifications to specific network users
 */

router.post('/users/numbers', async (req, res) => {
  req.checkBody({
    numbers: {
      notEmpty: true,
      isArray: true
    },
    message: {
      notEmpty: true,
      isString: true
    }
  });
  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: 'VALIDATION_ERROR', result: errors });
  }

  const { numbers, message } = req.body;
  const customerId = req.customerId;
  const prefix = req.admin.customer.prefix;
  const channelId = req.channelId;
  const usernameList = numbers.map(number => prefix + number);
  logger.info(`prefix=${prefix}, networkId=${channelId}, usernameList=${usernameList}`);
  try {
    const validatedUsers = await userService
      .channel
      .get
      .users(null, { customerId, channelId, usernameList });

    if (validatedUsers.length === 0) {
      return res.json({ err: true, err_msg: 'EMPTY_USERS' });
    }
    const usersChunk = _chunk(validatedUsers, 1500);
    const senderNumber = req.admin.customer.customerBusinessNumber;
    const senderRequests = usersChunk
      .map((chunk) => {
        const users = chunk.map(user => user.username);
        return systemMessageService.bulkSend(senderNumber, message, users);
      });
    try {
      const senderResult = await Promise.all(senderRequests);
      logger.info(senderResult);
      res.json({ err: false, result: { affectedUsers: validatedUsers } });
    } catch (e) {
      logger.error(e);
      res.json({ err: true, err_msg: 'SERVER_ERROR' });
    }
  } catch (e) {
    logger.error(e);
    res.json({ err: true, err_msg: 'VALIDATE_USERS_ERROR' });
  }
});


/**
 * URL: /v1/notifications/users
 * METHOD: POST
 * Description: System message batch sender
 */

router.post('/users', async (req, res) => {
  req.checkQuery({
    platforms: {
      notEmpty: true,
      isString: true
    },
    countries: {
      notEmpty: true,
      isString: true
    },
    startsWith: {
      optional: true,
      isString: true
    }
  });
  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: 'VALIDATION_ERROR', result: errors });
  }

  const { platforms, countries } = req.query;
  const { message } = req.body;
  const customerId = req.customerId;
  const prefix = req.admin.customer.prefix;
  const startsWith = parseInt(req.query.startsWith) !== parseInt(req.query.startsWith) ? req.query.startsWith : prefix + (req.query.startsWith || '');
  const channelId = req.channelId;

  const delimiter = 1500;

  try {
    const users = await systemMessageService
      .users
      .getChannelUsers({ customerId, platforms, countries, startsWith, channelId });
    logger.info(`users count=${users.length}`);

    const usersChunk = _chunk(users, delimiter);
    const senderNumber = req.admin.customer.customerBusinessNumber;

    const senderRequests = usersChunk
      .map((chunk) => {
        const users = chunk.map(user => user.username);
        return systemMessageService.bulkSend(senderNumber, message, users);
      });

    const senderResult = await Promise.all(senderRequests);
    // res.send({ usersChunk });
    logger.info(senderResult);

    res.json({ err: false, result: { affectedChunks: senderRequests.length } });
  } catch (e) {
    logger.error(e);
    res.json({ err: true, err_msg: e.message });
  }
});


module.exports = router;
