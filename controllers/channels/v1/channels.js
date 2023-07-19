const express = require('express');
const logger = require('../../../services/logger');
const systemMessage = require('../../../services/system-message');
const customerService = require('../../../services/customers');

const router = express.Router();

/**
 * URL: /channels/v1/channels
 * METHOD: POST
 * Description: Update network
 */

router.post('/invites', async (req, res) => {
  req.checkBody({
    channelInvites: {
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
  const { prefix, number } = customerService.get.customerId(customerId);
  const { channelInvites, channel } = req.body;

  const invitedNumbers = channelInvites.map(number => prefix + number.replace(/\+/i, ''));

  try {
    // eslint-disable-next-line no-restricted-syntax
    for (const invite of invitedNumbers) {
      const template = {
        params: {},
        text: ''
      };

      template.params = {
        '{token}': '',
        '{label}': channel.subject,
        '{uri}': channel.deepLink
      };
      template.text = systemMessage.templates.channels.invite;

      const inviteMessage = systemMessage.replaceAll(template.text, template.params);
      try {
        // eslint-disable-next-line no-await-in-loop
        await systemMessage.bulkSend(number, inviteMessage, [invite]);
      } catch (e) {
        console.log(e);
      }
    }

    res.json({ err: false, result: { ...channel } });
  } catch (e) {
    logger.error(e);
    res.json({ err: true, err_msg: e.message });
  }
});

module.exports = router;

