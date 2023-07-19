const express = require('express');
const config = require('config');
const request = require('request');
const fetch = require('node-fetch');
const channelService = require('../../services/channel');
const systemMessage = require('../../services/system-message');
const networkService = require('../../services/network');
const stompService = require('../../services/stomp');
const logger = require('../../services/logger');
const adminService = require('../../services/admin');
const { SERVER_MESSAGES } = require('../../helpers/constants');

const router = express.Router();


/**
 * URL: /v2/channels
 * METHOD: GET
 * Description: Get channels list
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
    },
    paid: {
      optional: true,
      isBoolean: true,
    }
  });

  const customerId = req.customerId;
  const limit = parseInt(req.query.limit, 10);
  const offset = parseInt(req.query.offset, 10) * limit;
  const startDate = req.query.startDate || '';
  const endDate = req.query.endDate || '';
  const paid = req.query.paid || null;
  const channelName = req.query.channelName || '';
  const openFireConf = config.get('openFire');
  const URL = `${openFireConf.host}/plugins/channels/getChannels`;
  const queryString = {
    customerId,
    key: channelName,
    startDate,
    endDate,
    offset,
    limit,
    paid,
  };
  logger.info(queryString);
  request.get(URL, {
    qs: queryString,
  }, async (err, httpResponse, response) => {
    if (err) {
      global.log.error(err);
      return res.json({ err: true, err_msg: 'SERVICES_ZANGI_NETWORK_ERROR' });
    }

    let result;
    try {
      result = JSON.parse(response).result;
      logger.info(result);
    } catch (e) {
      global.log.error(e);
      global.log.error(response);
      return res.json({ err: true, err_msg: 'ZANGI_SERVICE_ERROR', response });
    }
    return res.json({ err: false, result });
  });
});

router.get('/:channelRoom', async (req, res) => {
  req.checkParams({
    channelRoom: {
      notEmpty: true,
      isString: true
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
    },
    prefix: {
      notEmpty: true,
      isString: true
    }
  });

  const channelRoom = req.params.channelRoom;
  const prefix = req.administrator.customer.prefix;
  const limit = parseInt(req.query.limit, 10);
  const offset = parseInt(req.query.offset, 10) * limit;
  const openFireConf = config.get('openFire');
  fetch(`${openFireConf.host}/plugins/channels/getChannelInfo?prefix=${prefix}&roomName=${channelRoom}&offset=${offset}&limit=${limit}`)
    .then(response => response.json())
    .then((json) => {
      console.log(json, 'json');
      const ownerIds = json.result.ownerList || [];
      const adminIds = json.result.adminList || [];
      const memberIds = json.result.memberList || [];
      return channelService.get.all.channelInfo(null, { ownerIds, adminIds, memberIds, prefix })
        .then((data) => {
          json.result.ownerList = data.owners;
          json.result.adminList = data.admins;
          json.result.memberList = data.members;
        }).then(() => json);
    })
    .then(json => res.send(json))
    .catch(err => res.send(err));
});

/**
 * URL: /v2/channels/:channelRoom
 * METHOD: DELETE
 * Description: Delete channel
 */

router.delete('/:channelRoom', async (req, res) => {
  req.checkParams({
    channelRoom: {
      notEmpty: true,
      isString: true
    }
  });

  const channelRoom = req.params.channelRoom;
  const openFireConf = config.get('openFire');
  const URL = `${openFireConf.host}/plugins/channels/deleteChannel`;
  const queryString = {
    roomName: channelRoom,
  };

  request.delete(URL, {
    qs: queryString,
    headers: {
      'Content-Type': 'application/json'
    }
  }, async (err, httpResponse, response) => {
    if (err) {
      global.log.error(err);
      return res.json({ err: true, err_msg: 'SERVICES_ZANGI_NETWORK_ERROR' });
    }

    let result;
    try {
      result = JSON.parse(response).result;
      logger.info(result);
    } catch (e) {
      global.log.error(e);
      global.log.error(response);
      return res.json({ err: true, err_msg: 'ZANGI_SERVICE_ERROR', response });
    }
    return res.json({ err: false, result });
  });
});

router.post('/:channelRoom/admins', async (req, res) => {
  req.checkParams({
    channelRoom: {
      notEmpty: true,
      isString: true
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
  const { channelRoom } = req.params;
  const { email, password } = req.body;
  try {
    const result = await adminService
      .create
      .channelAdmin(null, { customerId, email, password, channelRoom });
    res.json({ err: false, result });
  } catch (e) {
    logger.error(e);
    res.json({ err: true, err_msg: e.message });
  }
});

router.get('/:channelRoom/admins', async (req, res) => {
  req.checkParams({
    channelRoom: {
      notEmpty: true,
      isString: true
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
  const { channelRoom } = req.params;
  const limit = parseInt(req.query.limit, 10);
  const offset = parseInt(req.query.offset, 10) * limit;
  try {
    const result = await adminService
      .list
      .channelAdmins(null, { customerId, channelRoom, limit, offset });
    res.json({ err: false, result });
  } catch (e) {
    logger.error(e);
    res.json({ err: true, err_msg: e.message });
  }
});

router.get('/:channelRoom/admins/count', async (req, res) => {
  req.checkParams({
    channelRoom: {
      notEmpty: true,
      isString: true
    }
  });
  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: 'VALIDATION_ERROR', result: errors });
  }
  const customerId = req.customerId;
  const { channelRoom } = req.params;
  try {
    const result = await adminService
      .count
      .channelAdmins(null, { customerId, channelRoom });
    res.json({ err: false, result });
  } catch (e) {
    logger.error(e);
    res.json({ err: true, err_msg: e.message });
  }
});

module.exports = router;

