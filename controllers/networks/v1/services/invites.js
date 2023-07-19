const express = require('express');
const { list, count, create } = require('../../../../services/network/services/invites');
const logger = require('../../../../services/logger');
const systemMessageService = require('../../../../services/system-message');
const customerService = require('../../../../services/customers');

const router = express.Router();


/**
 * URL: /networks/v1/services/:serviceId/invites
 * METHOD: GET
 * Description: Get service invites
 */

router.get('/:serviceId/invites', async (req, res) => {
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
  req.checkParams({
    serviceId: {
      notEmpty: true,
      isNumber: true
    }
  });
  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: 'VALIDATION_ERROR', result: errors });
  }
  const networkId = req.networkId;
  const serviceId = req.params.serviceId;
  const limit = +req.query.limit;
  const offset = +req.query.offset * limit;

  try {
    const result = await list
      .invites(null, { networkId, serviceId, limit, offset });
    res.json({ err: false, result });
  } catch (e) {
    logger.error(e);
    res.json({ err: true, err_msg: e.message });
  }
});


/**
 * URL: /networks/v1/services/:serviceId/invites/count
 * METHOD: GET
 * Description: Get service invites count
 */

router.get('/:serviceId/invites/count', async (req, res) => {
  req.checkParams({
    serviceId: {
      notEmpty: true,
      isNumber: true
    }
  });
  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: 'VALIDATION_ERROR', result: errors });
  }
  const networkId = req.networkId;
  const serviceId = req.params.serviceId;

  try {
    const result = await count
      .invites(null, { networkId, serviceId });
    res.json({ err: false, result });
  } catch (e) {
    logger.error(e);
    res.json({ err: true, err_msg: e.message });
  }
});


/**
 * URL: /networks/v1/services/:serviceId/invites
 * METHOD: POST
 * Description: create network service invites
 */

router.post('/:serviceId/invites', async (req, res) => {
  req.checkBody({
    numbers: {
      notEmpty: true,
      isArray: true
    }
  });
  req.checkParams({
    serviceId: {
      notEmpty: true,
      isNumber: true,
    },
  });
  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: 'VALIDATION_ERROR', result: errors });
  }
  const customerId = req.customerId;
  const adminId = req.adminId;
  const networkId = req.networkId;
  const { serviceId } = req.params;
  const { numbers } = req.body;
  const { prefix } = customerService.get.customerId(customerId);

  try {
    const result = await create.invites(null, {
      customerId,
      networkId,
      serviceId,
      adminId,
      numbers
    });


    const deepLinkHandlerUri = systemMessageService.deepLinkConfig(prefix);
    // eslint-disable-next-line no-restricted-syntax
    for (const invite of result.invites) {
      const params = {
        '{service}': invite.service.label,
        '{network}': invite.network.label,
        '{token}': invite.token,
        '{serviceUri}': deepLinkHandlerUri.uri
      };
      const text = systemMessageService.templates.services.invite;
      const inviteMessage = systemMessageService.replaceAll(text, params);
      try {
        // eslint-disable-next-line no-await-in-loop
        await systemMessageService.bulkSend(null, inviteMessage, [invite.invitee]);
      } catch (e) {
        console.log(e);
      }
    }
    res.json({ err: false, result: result.invites });
  } catch (e) {
    logger.error(e);
    res.json({ err: true, err_msg: e.message });
  }
});

module.exports = router;
