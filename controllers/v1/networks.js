const express = require('express');
const sqlDB = require('../../services/db');
const systemMessage = require('../../services/system-message');
const networkService = require('../../services/network');
const customerService = require('../../services/customers');
const logger = require('../../services/logger');
const { SERVER_MESSAGES } = require('../../helpers/constants');

const router = express.Router();

/**
 * URL: /v1/networks
 * METHOD: GET
 * Description: Get virtual networks list
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
    const sqlResult = await sqlDB.query('sql/networks/get-networks.sql', [customerId, limit, offset]);
    const result = sqlResult.rows;
    res.json({ err: false, result });
  } catch (e) {
    global.log.error(e);
    res.json({ err: true, err_msg: 'DB_ERROR', result: e });
  }
});


/**
 * URL: /v1/networks
 * METHOD: POST
 * Description: Create virtual network
 */

router.post('/', async (req, res) => {
  req.checkBody({
    name: {
      notEmpty: true,
      isString: true
    },
    description: {
      notEmpty: true,
      isString: true
    }
  });
  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: 'VALIDATION_ERROR', result: errors });
  }
  const customerId = req.customerId;
  const { name, description } = req.body;

  try {
    const sqlResult = await sqlDB.query('sql/networks/create-network.sql', [customerId, name, description]);
    const result = sqlResult.rows[0];
    res.json({ err: false, result });
  } catch (e) {
    global.log.error(e);
    res.json({ err: true, err_msg: 'DB_ERROR', result: e });
  }
});

/**
 * URL: /v1/networks/:networkId
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
    name: {
      notEmpty: true,
      isString: true
    },
    description: {
      notEmpty: true,
      isString: true
    },
    callName: {
      optional: true,
      isString: true
    }
  });
  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: 'VALIDATION_ERROR', result: errors });
  }
  const customerId = req.customerId;
  const { name, description, callName } = req.body;
  const networkId = +req.params.networkId;

  try {
    const sqlResult = await sqlDB.query('sql/networks/update-network.sql', [customerId, networkId, name, description, callName]);
    const result = sqlResult.rows[0];
    (async () => {
      await systemMessage.toServer.broadcast({
        networkId,
        command: SERVER_MESSAGES.NETWORK.UPDATE,
        params: { networkId, name, description, callName, ...result }
      });
    })();
    res.json({ err: false, result: { networkId, name, description, callName, ...result } });
  } catch (e) {
    global.log.error(e);
    res.json({ err: true, err_msg: 'DB_ERROR', result: e });
  }
});


/**
 * URL: /v1/networks/:networkId
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
    const sqlResult = await sqlDB.query('sql/networks/get-network.sql', [customerId, networkId]);
    const result = sqlResult.rows[0];
    res.json({ err: false, result });
  } catch (e) {
    global.log.error(e);
    res.json({ err: true, err_msg: 'DB_ERROR', result: e });
  }
});


/**
 * URL: /v1/networks/:networkId/invites
 * METHOD: GET
 * Description: Get virtual network invites
 */

router.get('/:networkId/invites', async (req, res) => {
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
  const { networkId } = req.params;
  const limit = parseInt(req.query.limit, 10);
  const offset = parseInt(req.query.offset, 10) * limit;

  try {
    const sqlResult = await sqlDB.query('sql/networks/get-network-invites.sql', [networkId, limit, offset]);
    const result = sqlResult.rows;
    logger.info(result);
    res.json({ err: false, result });
  } catch (e) {
    global.log.error(e);
    res.json({ err: true, err_msg: 'DB_ERROR', result: e });
  }
});


/**
 * URL: /v1/networks/:networkId/invites
 * METHOD: POST
 * Description: create virtual network invite
 */

router.post('/:networkId/invites', async (req, res) => {
  req.checkParams({
    networkId: {
      notEmpty: true,
      isNumber: true
    }
  });
  req.checkBody({
    networkInvites: {
      notEmpty: true,
      isArray: true
    }
  });
  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: 'VALIDATION_ERROR', result: errors });
  }
  const customerId = req.customerId;
  const adminId = req.administratorId;

  const { prefix, number } = customerService.get.customerId(customerId);

  const { networkId } = req.params;
  const { networkInvites } = req.body;
  const invitedNumbers = networkInvites.map(number => prefix + number.replace(/\+/i, ''));
  try {
    const networkResult = await networkService.get.one.network(null, { customerId, networkId });

    if (!networkResult) {
      throw new Error('INVALID_NETWORK');
    }
    logger.info(networkId);
    logger.info(adminId);
    logger.info(invitedNumbers);
    const sqlResult = await sqlDB.query('sql/networks/create-network-invite.sql', [networkId, adminId, JSON.stringify(invitedNumbers)]);
    const result = sqlResult.rows;
    logger.info(result);
    const deepLinkHandlerUri = systemMessage.deepLinkConfig(prefix);

    // eslint-disable-next-line no-restricted-syntax
    for (const invite of result) {
      const inviteMessage = systemMessage.replaceAll(systemMessage.templates.networks.invite,
        {
          '{token}': invite.token,
          '{label}': networkResult.label,
          '{uri}': deepLinkHandlerUri.uri
        });
      try {
        // eslint-disable-next-line no-await-in-loop
        await systemMessage.bulkSend(number, inviteMessage, [invite.invitee]);
      } catch (e) {
        console.log(e);
      }
    }
    res.json({ err: false, result });
  } catch (e) {
    global.log.error(e);
    res.json({ err: true, err_msg: 'DB_ERROR', result: e });
  }
});


/**
 * URL: /v1/networks/:networkId/invites/:inviteId
 * METHOD: DELETE
 * Description: delete virtual network invite
 */

router.delete('/:networkId/invites/:inviteId', async (req, res) => {
  req.checkParams({
    networkId: {
      notEmpty: true,
      isNumber: true
    },
    inviteId: {
      notEmpty: true,
      isNumber: true
    }
  });
  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: 'VALIDATION_ERROR', result: errors });
  }
  const customerId = req.customerId;
  const { networkId, inviteId } = req.params;

  try {
    const sqlResult = await sqlDB.query('sql/networks/delete-network-invite.sql', [customerId, inviteId, networkId]);
    const result = { deleted: !!sqlResult.rowCount };
    res.json({ err: false, result });
  } catch (e) {
    global.log.error(e);
    res.json({ err: true, err_msg: 'DB_ERROR', result: e });
  }
});


/**
 * URL: /v1/networks/:networkId/users/:userId
 * METHOD: DELETE
 * Description: Remove user from network
 */

router.delete('/:networkId/users/:userId', async (req, res) => {
  req.checkParams({
    networkId: {
      notEmpty: true,
      isNumber: true
    },
    userId: {
      notEmpty: true,
      isNumber: true
    }
  });
  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: 'VALIDATION_ERROR', result: errors });
  }
  const customerId = req.customerId;
  const adminId = req.administratorId;
  const { networkId, userId } = req.params;

  try {
    const sqlResult = await sqlDB.query('sql/networks/delete-network-user.sql', [customerId, networkId, userId, adminId]);
    const result = sqlResult.rows[0];


    res.json({ err: false, result });
  } catch (e) {
    global.log.error(e);
    res.json({ err: true, err_msg: 'DB_ERROR', result: e });
  }
});
module.exports = router;
