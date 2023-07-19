const express = require('express');
const sqlDB = require('../../services/db');
const systemMessage = require('../../services/system-message');
const channelService = require('../../services/channel');
const customerService = require('../../services/customers');
const logger = require('../../services/logger');
const { SERVER_MESSAGES } = require('../../helpers/constants');

const router = express.Router();

router.post('/:channelRoom/invites', async (req, res) => {
  req.checkParams({
    channelRoom: {
      notEmpty: true,
      isString: true
    }
  });
  req.checkBody({
    channelInvites: {
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

  const { channelRoom } = req.params;
  const { channelInvites } = req.body;
  const invitedNumbers = channelInvites.map(number => prefix + number.replace(/\+/i, ''));
  try {
    const channelResult = await channelService.get.one.channel(null, { prefix, channelRoom });

    if (!channelResult) {
      throw new Error('INVALID_NETWORK');
    }

    logger.info(channelRoom);
    logger.info(adminId);
    logger.info(invitedNumbers);
    // const sqlResult = await sqlDB.query('sql/networks/create-network-invite.sql', [channelRoom, adminId, JSON.stringify(invitedNumbers)]);
    // const result = sqlResult.rows;
    // logger.info(result);
    const deepLinkHandlerUri = systemMessage.deepLinkConfig(prefix);

    // eslint-disable-next-line no-restricted-syntax
    for (const invite of invitedNumbers) {
      const inviteMessage = systemMessage.replaceAll(systemMessage.templates.channels.invite,
        {
          '{token}': '',
          '{label}': channelResult.result.subject,
          '{uri}': channelResult.result.deepLink
        });
      try {
        // eslint-disable-next-line no-await-in-loop
        await systemMessage.bulkSend(number, inviteMessage, [invite]);
      } catch (e) {
        console.log(e);
      }
    }
    res.json({ err: false, channelResult });
  } catch (e) {
    global.log.error(e);
    res.json({ err: true, err_msg: 'DB_ERROR', result: e });
  }
});

module.exports = router;
