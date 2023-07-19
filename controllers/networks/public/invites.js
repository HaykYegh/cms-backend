const express = require('express');
const logger = require('../../../services/logger');
const systemMessageService = require('../../../services/system-message');
const networkInviteService = require('../../../services/network/invites');
const customerService = require('../../../services/customers');


const router = express.Router();
/**
 * URL: /networks/public/invites
 * METHOD: GET
 * Description: Get virtual networks by params
 */

router.post('/', async (req, res) => {
  req.checkBody({
    mobile: {
      notEmpty: true,
      isNumber: true
    }
  });
  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ error: true, errorMessage: 'VALIDATION_ERROR', result: errors });
  }

  const customerId = req.customerId;
  const { prefix, businessNumber } = customerService.get.customerId(customerId);

  const consumerId = req.consumerId;


  const adminId = req.adminId;
  const networkId = req.networkId;
  const mobile = req.body.mobile;

  try {
    const { invites, network } = await networkInviteService.create(null, {
      customerId,
      adminId,
      networkId,
      prefix,
      numbers: [mobile],
      consumerId
    });

    const invite = invites[0];
    const inviteMessageTemplate = systemMessageService.templates.networks.invite;

    const deepLinkHandlerUri = systemMessageService.deepLinkConfig(prefix);

    const inviteMessage = systemMessageService.replaceAll(inviteMessageTemplate,
      {
        '{token}': invite.token,
        '{label}': network.label,
        '{uri}': deepLinkHandlerUri.uri
      });


    await systemMessageService.bulkSend(businessNumber, inviteMessage, [invite.invitee]);

    res.json({ err: false, result: { invite, network } });
  } catch (e) {
    logger.error(e);
    res.json({ err: true, err_msg: e.message });
  }
});


module.exports = router;

