const express = require('express');
const networkInviteService = require('../../../services/network/invites');
const networkServicesService = require('../../../services/network/services');
const networkService = require('../../../services/network');
const logger = require('../../../services/logger');
const systemMessage = require('../../../services/system-message');
const { SERVER_MESSAGES } = require('../../../helpers/constants');
const stompService = require('../../../services/stomp');
const customerService = require('../../../services/customers');

const router = express.Router();

/**
 * URL: /networks/v1/networks
 * METHOD: GET
 * Description: GET network
 */

router.get('/', async (req, res) => {
  const customerId = req.customerId;
  const networkId = req.networkId;

  try {
    const result = await networkService.get.one.network(null, {
      customerId,
      networkId,
    });
    res.json({ err: false, result });
  } catch (e) {
    logger.error(e);
    res.json({ err: true, err_msg: e.message });
  }
});
/**
 * URL: /networks/v1/networks
 * METHOD: POST
 * Description: Update network
 */

router.post('/', async (req, res) => {
  req.checkBody({
    label: {
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
    isPublic: {
      optional: true,
      isBoolean: true
    }
  });
  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: 'VALIDATION_ERROR', result: errors });
  }
  const customerId = req.customerId;
  const { label, description, callName, isPublic } = req.body;
  const networkId = req.networkId;

  try {
    const updated = await networkService.update.network(null, {
      customerId,
      networkId,
      label,
      callName,
      description,
      isPublic
    });

    try {
      await systemMessage.toServer.broadcast({
        networkId,
        command: SERVER_MESSAGES.NETWORK.UPDATE,
        params: {
          networkId,
          label,
          nickname: updated.nickname,
          callName,
          description,
          isPublic
        }
      });
    } catch (e) {
      logger.error(e);
    }
    res.json({ err: false,
      result: {
        customerId,
        networkId,
        label,
        callName,
        description,
        isPublic
      }
    });
  } catch (e) {
    logger.error(e);
    res.json({ err: true, err_msg: e.message });
  }
});


/**
 * URL: /networks/v1/networks/invites
 * METHOD: GET
 * Description: Get virtual network invites
 */

router.get('/invites', async (req, res) => {
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
  const networkId = req.networkId;
  const limit = parseInt(req.query.limit, 10);
  const offset = parseInt(req.query.offset, 10) * limit;

  try {
    const result = await networkInviteService.get
      .all.records(null, { customerId, networkId, limit, offset });
    res.json({ error: false, result });
  } catch (e) {
    logger.error(e);
    res.json({ err: true, err_msg: e.message });
  }
});

/**
 * URL: /networks/v1/networks/invites/count
 * METHOD: GET
 * Description: Get virtual network invites count
 */

router.get('/invites/count', async (req, res) => {
  const customerId = req.customerId;
  const networkId = req.networkId;
  try {
    const result = await networkInviteService.get
      .all.count(null, { customerId, networkId });
    res.json({ error: false, result });
  } catch (e) {
    logger.error(e);
    res.json({ err: true, err_msg: e.message });
  }
});


/**
 * URL: /networks/v1/networks/invites
 * METHOD: POST
 * Description: create virtual network invite
 */

router.post('/invites', async (req, res) => {
  req.checkBody({
    networkInvites: {
      notEmpty: true,
      isArray: true
    },
    serviceId: {
      optional: true
    },
  });
  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: 'VALIDATION_ERROR', result: errors });
  }
  const customerId = req.customerId;
  const adminId = req.adminId;


  const { prefix, number } = customerService.get.customerId(customerId);
  const networkId = req.networkId;
  const { networkInvites } = req.body;

  try {
    const inviteResult = await networkInviteService.create(null, {
      customerId,
      adminId,
      networkId,
      prefix,
      numbers: networkInvites
    });
    const network = inviteResult.network;
    // eslint-disable-next-line no-restricted-syntax
    for (const invite of inviteResult.invites) {
      const template = {
        params: {},
        text: ''
      };

      // if (serviceId) {
      //   template.params = {
      //     '{service}': network.service.label,
      //     '{network}': inviteResult.network.label,
      //     '{token}': invite.token,
      //   };
      //   template.text = systemMessage.templates.services.invite;
      // } else {
      //   template.params = {
      //     '{token}': invite.token,
      //     '{label}': inviteResult.network.label
      //   };
      //   template.text = systemMessage.templates.networks.invite;
      // }


      const deepLinkHandlerUri = systemMessage.deepLinkConfig(prefix);

      template.params = {
        '{token}': invite.token,
        '{label}': inviteResult.network.label,
        '{uri}': deepLinkHandlerUri.uri
      };
      template.text = systemMessage.templates.networks.invite;

      const inviteMessage = systemMessage.replaceAll(template.text, template.params);
      try {
        // eslint-disable-next-line no-await-in-loop
        await systemMessage.bulkSend(number, inviteMessage, [invite.invitee]);
      } catch (e) {
        console.log(e);
      }
    }

    res.json({ err: false, result: { ...inviteResult } });
  } catch (e) {
    logger.error(e);
    res.json({ err: true, err_msg: e.message });
  }
});


/**
 * URL: /v1/networks/invites/:inviteId
 * METHOD: DELETE
 * Description: delete virtual network invite
 */

router.delete('/invites/:inviteId', async (req, res) => {
  req.checkParams({
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
  const networkId = req.networkId;
  const { inviteId } = req.params;

  try {
    const deleted = await networkInviteService.delete(null, { customerId, networkId, inviteId });
    res.json({ err: false, result: { deleted } });
  } catch (e) {
    logger.error(e);
    res.json({ err: true, err_msg: e.message || e });
  }
});

/**
 * URL: /networks/v1/users/:userId
 * METHOD: DELETE
 * Description: Remove user from network
 */


router.delete('/users/:userId', async (req, res) => {
  req.checkParams({
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
  const networkId = req.networkId;
  const adminId = req.adminId;
  const { userId } = req.params;
  try {
    const result = await networkService.delete
      .networkUser(null, { customerId, networkId, userId, adminId });

    const { activity } = result;

    stompService.sendQueueMessage('NETWORK_USAGE_HANDLER', { type: 'LEAVE', activity });

    res.json({ err: false, result: { kick: true } });
  } catch (e) {
    logger.error(e);
    res.json({ err: true, err_msg: e.message });
  }
});


/**
 * URL: /networks/v1/users/count
 * METHOD: GET
 * Description: Get Network users count
 */


router.get('/users/count', async (req, res) => {
  const customerId = req.customerId;
  const networkId = req.networkId;
  try {
    const result = await networkService.get.count.networkUsers(null, { customerId, networkId });

    res.json({ err: false, result });
  } catch (e) {
    logger.error(e);
    res.json({ err: true, err_msg: e.message });
  }
});


/**
 * URL: /networks/v1/networks/trial
 * METHOD: POST
 * Description: Start trial
 */

router.post('/trial', async (req, res) => {
  const customerId = req.customerId;
  const networkId = req.networkId;

  try {
    const result = await networkService.startTrial(null, {
      customerId,
      networkId
    });

    if (result.trial.qnt === 0) {
      stompService.sendQueueMessage('NETWORK_TRIAL_PERIOD_START', result.trial);
    }

    res.json({ err: false, result: { ...result.trial } });
  } catch (e) {
    logger.error(e);
    res.json({ err: true, err_msg: e.message });
  }
});


/**
 * URL: /networks/v1/networks/services
 * METHOD: GET
 * Description: Get network services
 */

router.get('/services', async (req, res) => {
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
  const networkId = req.networkId;
  const limit = +req.query.limit;
  const offset = +req.query.offset * limit;

  try {
    const result = await networkServicesService
      .list
      .services(null, { customerId, networkId, limit, offset });
    res.json({ err: false, result });
  } catch (e) {
    logger.error(e);
    res.json({ err: true, err_msg: e.message });
  }
});
module.exports = router;

