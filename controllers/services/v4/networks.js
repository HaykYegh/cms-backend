const express = require('express');
const logger = require('../../../services/logger');
const networkService = require('../../../services/network');
const stompService = require('../../../services/stomp');

const router = express.Router();

/**
 * URL: /v4/networks/:token
 * METHOD: GET
 * Description: Get virtual network by nickname or invitation token
 */

router.get('/:token', async (req, res) => {
  req.checkParams({
    token: {
      notEmpty: true,
      isString: true
    }
  });

  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ error: true, errorMessage: 'VALIDATION_ERROR', result: errors });
  }
  const customerId = req.user.customerId;
  const username = req.user.username;
  const { token } = req.params;
  try {
    const result = await networkService.get.one.byInviteOrNickname(null, {
      customerId,
      token,
      username
    });

    console.log(result);

    res.json({ error: false, result });
  } catch (e) {
    logger.error(e);
    res.json({ error: true, errorMessage: e.message });
  }
});


/**
 * URL: /v4/networks
 * METHOD: POST
 * Description: Join to virtual network
 */

router.post('/', async (req, res) => {
  req.checkBody({
    token: {
      notEmpty: true,
      isString: true
    }
  });

  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ error: true, errorMessage: 'VALIDATION_ERROR', result: errors });
  }
  const customerId = req.user.customerId;
  const username = req.user.username;
  const token = req.body.token.toLowerCase();

  try {
    const result = await networkService.create.networkUser(null, {
      customerId,
      token,
      username
    });

    console.log("### notififer");
    console.log(result);
    console.log("### notififer #####");

    const { error, activity = null } = result;

    if (error) {
      return res.json(result);
    }

    if (result.notifier) {
      const notifier = { ...result.notifier };
      delete result.notifier;
      stompService.sendQueueMessage('NETWORK_INVITE_NOTIFIER_HANDLER', notifier);
    }

    if (activity) {
      stompService.sendQueueMessage('NETWORK_USAGE_HANDLER', { type: 'JOIN', activity });
    }

    res.json({ error: false, result });
  } catch (e) {
    logger.error(e);
    res.json({ error: true, errorMessage: e.message });
  }
});


/**
 * URL: /v1/networks/:networkId
 * METHOD: DELETE
 * Description: leave virtual network
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
  const customerId = req.user.customerId;
  const userId = req.user.userId;
  const { networkId } = req.params;
  try {
    const result = await networkService.delete.networkUser(null, { customerId, networkId, userId });
    const { activity = null } = result;
    if (activity) {
      stompService.sendQueueMessage('NETWORK_USAGE_HANDLER', { type: 'LEAVE', activity });
    }
    res.json({ error: false, result: { leave: true } });
  } catch (e) {
    logger.error(e);
    res.json({ error: true, errorMessage: e.message });
  }
});

module.exports = router;
