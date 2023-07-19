const express = require('express');
const _chunk = require('lodash/chunk');
const systemMessageService = require('../../../../services/system-message');
const logger = require('../../../../services/logger');
const userService = require('../../../../services/user');
const customerService = require('../../../../services/customers');

const router = express.Router();


/**
 * URL: /v2/notifications/senders
 * NAME: Sender middleware
 */

router.use('/senders', require('./senders'));


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
    },
    serviceId: {
      optional: true,
      isNumber: true
    }
  });
  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: 'VALIDATION_ERROR', result: errors });
  }

  const { platforms, countries } = req.query;
  const customerId = req.customerId;
  const prefix = req.admin.customer.prefix;
  const startsWith = prefix + (req.query.startsWith || '');
  const networkId = req.query.serviceId ? null : req.networkId;
  const serviceId = req.query.serviceId;

  try {
    const count = await systemMessageService
      .users
      .getUsersCount({ customerId, platforms, countries, startsWith, networkId, serviceId });
    res.json({ err: false, result: { count } });
  } catch (e) {
    logger.error(e);
    res.json({ err: true, err_msg: e });
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
    },
    serviceId: {
      optional: true,
      isNumber: true
    },
    senderId: {
      optional: true,
      isNumber: true
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
  const startsWith = prefix + (req.query.startsWith || '');
  const networkId = req.body.serviceId ? null : req.networkId;
  const serviceId = req.body.serviceId;
  const senderId = req.body.senderId;


  const delimiter = 1500;

  try {
    const users = await systemMessageService
      .users
      .getUsers({ customerId, platforms, countries, startsWith, networkId, serviceId });
    logger.info(`users count=${users.length}`);

    const usersChunk = _chunk(users, delimiter);

    let sender = null;

    if (senderId) {
      sender = await systemMessageService
        .senders
        .retrieve
        .sender(null, { customerId, senderId });
    }
    const senderRequests = usersChunk
      .map((chunk) => {
        const users = chunk.map(user => user.username);
        if (sender) {
          let image = null;
          if (sender.image) {
            image = sender.image;
            image.id = sender.image.messageSenderImageId;
          }

          const senderModel = {
            label: sender.label,
            number: sender.number,
            isVerified: sender.isVerified,
            image
          };

          return systemMessageService.toServer.sendViaSender(senderModel, message, users);
        }
        const { number } = customerService.get.customerId(customerId);
        return systemMessageService.bulkSend(number, message, users);
      });

    await Promise.all(senderRequests);

    res.json({ err: false, result: { affectedChunks: senderRequests.length } });
  } catch (e) {
    logger.error(e);
    res.json({ err: true, err_msg: e.message });
  }
});


/**
 * URL: /v1/notifications/users/numbers
 * METHOD: POST
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
    },
    serviceId: {
      optional: true,
      isNumber: true
    },
    senderId: {
      optional: true,
      isNumber: true
    }
  });
  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: 'VALIDATION_ERROR', result: errors });
  }


  const { numbers, message } = req.body;
  const customerId = req.customerId;
  const prefix = req.admin.customer.prefix;
  const networkId = req.body.serviceId ? null : req.networkId;
  const usernameList = numbers.map(number => prefix + number);
  const serviceId = req.body.serviceId;
  const senderId = req.body.senderId;


  logger.info(`prefix=${prefix}, networkId=${networkId}, usernameList=${usernameList}`);


  try {
    const validatedUsers = await userService
      .network
      .get
      .users(null, { customerId, networkId, serviceId, usernameList });
    if (validatedUsers.length === 0) {
      return res.json({ err: true, err_msg: 'EMPTY_USERS' });
    }
    const usersChunk = _chunk(validatedUsers, 1500);
    let sender = null;

    if (senderId) {
      sender = await systemMessageService
        .senders
        .retrieve
        .sender(null, { customerId, senderId });
    }
    const senderRequests = usersChunk
      .map((chunk) => {
        const users = chunk.map(user => user.username);
        if (sender) {
          let image = null;
          if (sender.image) {
            image = sender.image;
            image.id = sender.image.messageSenderImageId;
          }

          const senderModel = {
            label: sender.label,
            number: sender.number,
            isVerified: sender.isVerified,
            image
          };

          return systemMessageService.toServer.sendViaSender(senderModel, message, users);
        }
        const { number } = customerService.get.customerId(customerId);
        return systemMessageService.bulkSend(number, message, users);
      });
    await Promise.all(senderRequests);
    res.json({ err: false, result: { affectedChunks: senderRequests.length } });
  } catch (e) {
    logger.error(e);
    res.json({ err: true, err_msg: 'VALIDATE_USERS_ERROR' });
  }
});


module.exports = router;
