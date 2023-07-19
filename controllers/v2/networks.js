const express = require('express');
const systemMessage = require('../../services/system-message');
const networkService = require('../../services/network');
const stompService = require('../../services/stomp');
const logger = require('../../services/logger');
const adminService = require('../../services/admin');
const { SERVER_MESSAGES } = require('../../helpers/constants');

const router = express.Router();


/**
 * URL: /v2/networks
 * METHOD: GET
 * Description: Get networks list
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
  const limit = parseInt(req.query.limit, 10);
  const offset = parseInt(req.query.offset, 10) * limit;

  try {
    const result = await networkService.get.all.networks(null, { customerId, limit, offset });
    res.json({ err: false, result });
  } catch (e) {
    logger.error(e);
    res.json({ err: true, err_msg: 'DB_ERROR' });
  }
});


/**
 * URL: /v1/networks
 * METHOD: POST
 * Description: Create virtual network
 */

router.post('/', async (req, res) => {
  req.checkBody({
    nickname: {
      notEmpty: true,
      isString: true
    },
    description: {
      optional: true,
      isString: true
    },
    callName: {
      optional: true,
      isString: true
    },
    label: {
      notEmpty: true,
      isString: true
    },
    isPublic: {
      notEmpty: true,
      isBoolean: true
    }
  });
  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: 'VALIDATION_ERROR', result: errors });
  }
  const customerId = req.customerId;
  const { label, callName, isPublic } = req.body;
  const description = req.body.description ? req.body.description : label;

  const nickname = req.body.nickname.toLowerCase();

  try {
    const result = await networkService.create.byAdmin(null,
      { customerId, nickname, label, callName, description, isPublic });
    res.json({ err: false, result });
  } catch (e) {
    logger.error(e);
    res.json({ err: true, err_msg: e.message });
  }
});

/**
 * URL: /v2/networks/:networkId
 * METHOD: PUT
 * Description: Update virtual network
 */

router.put('/:networkId', async (req, res) => {
  req.checkParams({
    networkId: {
      notEmpty: true,
      isNumber: true
    }
  });
  req.checkBody({
    nickname: {
      notEmpty: true,
      isString: true
    },
    description: {
      notEmpty: true,
      isString: true
    },
    label: {
      notEmpty: true,
      isString: true
    },
    callName: {
      optional: true,
      isString: true
    },
    isPublic: {
      notEmpty: true,
      isBoolean: true
    }
  });
  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: 'VALIDATION_ERROR', result: errors });
  }
  const customerId = req.customerId;
  const { label, callName, description, isPublic } = req.body;
  const networkId = +req.params.networkId;
  const nickname = req.body.nickname.toLowerCase();

  try {
    const result = await networkService.update.network(null,
      { customerId, networkId, nickname, label, callName, description, isPublic });
    await systemMessage.toServer.broadcast({
      networkId,
      command: SERVER_MESSAGES.NETWORK.UPDATE,
      params: { networkId, nickname, label, callName, description }
    });
    res.json({ err: false, result });
  } catch (e) {
    logger.error(e);
    res.json({ err: true, err_msg: e.message });
  }
});


/**
 * URL: /v2/networks/:networkId
 * METHOD: GET
 * Description: Get virtual network by id
 */

router.get('/:networkId', async (req, res) => {
  req.checkParams({
    networkId: {
      notEmpty: true,
      isNumber: true
    }
  });
  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: 'VALIDATION_ERROR', result: errors });
  }
  const customerId = req.customerId;
  const { networkId } = req.params;

  try {
    const result = await networkService.get.one.network(null, { customerId, networkId });
    res.json({ err: false, result });
  } catch (e) {
    logger.error(e);
    res.json({ err: true, err_msg: e.message });
  }
});


/**
 * URL: /v2/networks/:networkId/users
 * METHOD: GET
 * Description: Get network users
 */

router.get('/:networkId/users', async (req, res) => {
  req.checkParams({
    networkId: {
      notEmpty: true,
      isNumber: true
    }
  });
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
  const prefix = req.administrator.customer.prefix;

  const { networkId } = req.params;

  const limit = parseInt(req.query.limit, 10);
  const offset = parseInt(req.query.offset, 10) * limit;


  try {
    const result = await networkService.get.all.networkUsers(null,
      { customerId, networkId, prefix, limit, offset });
    res.json({ err: false, result });
  } catch (e) {
    logger.error(e);
    res.json({ err: true, err_msg: 'DB_ERROR' });
  }
});


/**
 * URL: /v2/networks/:networkId
 * METHOD: Delete
 * Description: Delete virtual network by id
 */

router.delete('/:networkId', async (req, res) => {
  req.checkParams({
    networkId: {
      notEmpty: true,
      isNumber: true
    }
  });
  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: 'VALIDATION_ERROR', result: errors });
  }
  const customerId = req.customerId;
  const { networkId } = req.params;

  try {
    await networkService.delete.network(null, { customerId, networkId });
    res.json({ err: false, result: { deleted: true } });
  } catch (e) {
    logger.error(e);
    res.json({ err: true, err_msg: e.message });
  }
});

/**
 * URL: /v2/networks/:networkId/users/:userId
 * METHOD: DELETE
 * Description: Remove user from network
 */


router.delete('/:networkId/users/:userId', async (req, res) => {
  req.checkParams({
    userId: {
      notEmpty: true,
      isNumber: true
    },
    networkId: {
      notEmpty: true,
      isNumber: true
    }
  });
  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: 'VALIDATION_ERROR', result: errors });
  }
  const customerId = req.customerId;
  const { userId, networkId } = req.params;
  try {
    const result = await networkService.delete.networkUser(null, { customerId, networkId, userId });
    const { activity } = result;
    stompService.sendQueueMessage('NETWORK_USAGE_HANDLER', { type: 'LEAVE', activity });
    res.json({ err: false, result: { kick: true } });
  } catch (e) {
    logger.error(e);
    res.json({ err: true, err_msg: e.message });
  }
});


/**
 * URL: /v2/networks/:networkId/admins
 * METHOD: POST
 * Description: Create admin for network
 */


router.post('/:networkId/admins', async (req, res) => {
  req.checkParams({
    networkId: {
      notEmpty: true,
      isNumber: true
    }
  });
  req.checkBody({
    email: {
      notEmpty: true,
      isString: true
    },
    password: {
      notEmpty: true,
      isString: true
    }
  });
  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: 'VALIDATION_ERROR', result: errors });
  }
  const customerId = req.customerId;
  const { networkId } = req.params;
  const { email, password } = req.body;
  try {
    const result = await adminService
      .create
      .admin(null, { customerId, networkId, email, password });
    res.json({ err: false, result });
  } catch (e) {
    logger.error(e);
    res.json({ err: true, err_msg: e.message });
  }
});

/**
 * URL: /v2/networks/:networkId/admins
 * METHOD: GET
 * Description: Get admins
 */


router.get('/:networkId/admins', async (req, res) => {
  req.checkParams({
    networkId: {
      notEmpty: true,
      isNumber: true
    }
  });
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
  const { networkId } = req.params;
  const limit = parseInt(req.query.limit, 10);
  const offset = parseInt(req.query.offset, 10) * limit;
  try {
    const result = await adminService
      .list
      .admins(null, { customerId, networkId, limit, offset });
    res.json({ err: false, result });
  } catch (e) {
    logger.error(e);
    res.json({ err: true, err_msg: e.message });
  }
});
/**
 * URL: /v2/networks/:networkId/admins/count
 * METHOD: GET
 * Description: Get admins count
 */


router.get('/:networkId/admins/count', async (req, res) => {
  req.checkParams({
    networkId: {
      notEmpty: true,
      isNumber: true
    }
  });
  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: 'VALIDATION_ERROR', result: errors });
  }
  const customerId = req.customerId;
  const { networkId } = req.params;
  try {
    const result = await adminService
      .count
      .admins(null, { customerId, networkId });
    res.json({ err: false, result });
  } catch (e) {
    logger.error(e);
    res.json({ err: true, err_msg: e.message });
  }
});

module.exports = router;

