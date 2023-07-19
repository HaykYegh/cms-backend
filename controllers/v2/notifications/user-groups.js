const express = require('express');
const systemMessageService = require('../../../services/system-message');
const logger = require('../../../services/logger');
const customerService = require('../../../services/customers');
const userGroupService = require('../../../services/user/groups');
const _chunk = require('lodash/chunk');

const router = express.Router();


/**
 * URL: /v2/notifications/user-groups
 * METHOD: POST
 * Description: Send a notification to multiple groups at once
 */

router.post('/', async (req, res) => {
  req.checkBody({
    userGroupId: {
      notEmpty: true,
      isNumber: true
    },
    senderId: {
      notEmpty: true,
      isNumber: true
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

  const customerId = req.customerId;
  const { senderId, message } = req.body;
  const { prefix } = customerService.get.customerId(customerId);

  const delimiter = 1500;
  const userGroupId = req.body.userGroupId === -1 ? null : req.body.userGroupId;

  try {
    const groupMembers = await userGroupService
      .list
      .groupMembersNumbers(null, { customerId, userGroupId });
    const users = groupMembers.map(member => prefix + member.number);
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
      .map((users) => {
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

module.exports = router;
