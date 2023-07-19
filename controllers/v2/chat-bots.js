const express = require('express');
const logger = require('../../services/logger');
const chatBotService = require('../../services/chatBot');
const utils = require('../../helpers/utils');
// const formidable = require('formidable');

const router = express.Router();


/**
 * URL: /v2/chat-bots
 * METHOD: GET
 * Description: GET get chat bot list
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
  const limit = +req.query.limit;
  const offset = parseInt(req.query.offset, 10) * limit;
  const customerId = req.customerId;

  try {
    const result = await chatBotService.get.all.chatBots(null, { customerId, limit, offset });
    res.json({ err: false, result });
  } catch (e) {
    logger.error(e);
    res.json({ err: true, err_msg: 'DB_ERROR' });
  }
});


/**
 * URL: /v2/chat-bots/:chatBotId
 * METHOD: GET
 * Description: GET get chat bot by id
 */

router.get('/:chatBotId', async (req, res) => {
  req.checkParams({
    chatBotId: {
      notEmpty: true,
      isNumber: true
    }
  });
  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: 'VALIDATION_ERROR', result: errors });
  }
  const customerId = req.customerId;
  const { chatBotId } = req.params;
  const prefix = req.administrator.customer.prefix;

  try {
    const result = await chatBotService
      .get.one.chatBot(null, { customerId, chatBotId, prefix });

    res.json({ err: false, result });
  } catch (e) {
    logger.error(e);
    res.json({ err: true, err_msg: 'DB_ERROR' });
  }
});


/**
 * URL: /v2/chat-bots
 * METHOD: POST
 * Description: POST Create third party provider, SMS, Voice Message etc ...
 */

router.post('/', async (req, res) => {
  req.checkBody({
    name: {
      notEmpty: true,
      isString: true
    },
    nickname: {
      notEmpty: true,
      isString: true
    },
    description: {
      notEmpty: true,
      isString: true
    },
  });
  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: 'VALIDATION_ERROR', result: errors });
  }
  const customerId = req.customerId;
  const { nickname, name, description } = req.body;
  const avatar = '';
  try {
    const result = await chatBotService
      .create.chatBot(null, { customerId, nickname, name, description, avatar });

    res.json({ err: false, result });
  } catch (e) {
    logger.error(e);
    res.json({ err: true, err_msg: 'DB_ERROR' });
  }
});


/**
 * URL: /v2/chat-bots/:chatBotId
 * METHOD: PUT
 * Description: PUT update chat bot.
 */

router.put('/:chatBotId', async (req, res) => {
  req.checkBody({
    name: {
      notEmpty: true,
      isString: true
    },
    description: {
      notEmpty: true,
      isString: true
    },
  });
  req.checkParams({
    chatBotId: {
      notEmpty: true,
      isNumber: true,
    },
  });
  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: errors }).send();
  }
  const customerId = req.customerId;
  const { name, description } = req.body;
  const { chatBotId } = req.params;

  const avatar = '';
  try {
    const result = await chatBotService
      .update.chatBot(null, { customerId, chatBotId, name, description, avatar });
    res.json({ err: false, result });
  } catch (e) {
    logger.error(e);
    res.json({ err: true, err_msg: 'DB_ERROR' });
  }
});


/**
 * URL: /v2/chat-bots/:chatBotId
 * METHOD: DELETE
 * Description: DELETE chat bot
 */

router.delete('/:chatBotId', async (req, res) => {
  req.checkParams({
    chatBotId: {
      notEmpty: true,
      isNumber: true
    }
  });
  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: 'VALIDATION_ERROR', result: errors });
  }
  const customerId = req.customerId;
  const { chatBotId } = req.params;

  try {
    const result = await chatBotService
      .delete.chatBot(null, { customerId, chatBotId });

    res.json({ err: false, result });
  } catch (e) {
    logger.error(e);
    res.json({ err: true, err_msg: 'DB_ERROR' });
  }
});


/**
 * URL: /v2/chat-bots/:chatBotId/credentials
 * METHOD: GET
 * Description: GET get chat bot by credentials by chat bot id
 */

router.get('/:chatBotId/credentials', async (req, res) => {
  req.checkParams({
    chatBotId: {
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
  const limit = +req.query.limit;
  const offset = parseInt(req.query.offset, 10) * limit;

  const { chatBotId } = req.params;

  try {
    const result = await chatBotService
      .get.all.chatBotCredentials(null, { customerId, chatBotId, limit, offset });

    res.json({ err: false, result });
  } catch (e) {
    logger.error(e);
    res.json({ err: true, err_msg: 'DB_ERROR' });
  }
});


/**
 * URL: /v2/chat-bots/:chatBotId/credentials
 * METHOD: POST
 * Description:  Generate chat bot by credential
 */

router.post('/:chatBotId/credentials', async (req, res) => {
  req.checkParams({
    chatBotId: {
      notEmpty: true,
      isNumber: true
    }
  });
  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: 'VALIDATION_ERROR', result: errors });
  }
  const customerId = req.customerId;

  const { chatBotId } = req.params;

  try {
    const result = await chatBotService
      .create.chatBotCredential(null, { customerId, chatBotId });

    res.json({ err: false, result });
  } catch (e) {
    logger.error(e);
    res.json({ err: true, err_msg: 'DB_ERROR' });
  }
});


/**
 * URL: /v2/chat-bots/:chatBotId/credentials/:chatBotCredentialId
 * METHOD: DELETE
 * Description:  Delete chat bot  credential by id
 */

router.delete('/:chatBotId/credentials/:chatBotCredentialId', async (req, res) => {
  req.checkParams({
    chatBotId: {
      notEmpty: true,
      isNumber: true
    },
    chatBotCredentialId: {
      notEmpty: true,
      isNumber: true
    }
  });
  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: 'VALIDATION_ERROR', result: errors });
  }
  const customerId = req.customerId;

  const { chatBotId, chatBotCredentialId } = req.params;

  try {
    const result = await chatBotService
      .delete.chatBotCredential(null, { customerId, chatBotId, chatBotCredentialId });

    res.json({ err: false, result });
  } catch (e) {
    logger.error(e);
    res.json({ err: true, err_msg: 'DB_ERROR' });
  }
});


/**
 * URL: /v2/chat-bots/:chatBotId/credentials
 * METHOD: POST
 * Description:  Generate chat bot by credential
 */

router.post('/:chatBotId/avatar', async (req, res) => {
  req.checkParams({
    chatBotId: {
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
  const { chatBotId } = req.params;

  try {
    const uploadedFiles = await utils.getUploadedFiles(req);

    try {
      const result = await chatBotService
        .update.chatBotAvatar(null, { customerId, chatBotId, prefix, uploaded: uploadedFiles });

      res.json({ err: false, result });
    } catch (e) {
      logger.error(e);
      res.json({ err: true, err_msg: 'DB_ERROR' });
    }
  } catch (e) {
    logger.error(e);
    res.json({ err: true, err_msg: 'FS_ERROR' });
  }
});


// console.log(router)


module.exports = router;
