const express = require('express');
const config = require('config');
const request = require('request');
const utils = require('../../../helpers/utils');
const helpers = require('../../../helpers');
const channelService = require('../../../services/channel');

const router = express.Router();

/*
 * URL: /v2/billing/channelTransactions
 * METHOD: GET
 * Description: Get top up transactions
 */
router.get('/', async (req, res) => {
  req.checkQuery({
    offset: {
      notEmpty: true,
      isNumber: true
    },
    limit: {
      optional: true,
      isNumber: true,
    },
    startDate: {
      notEmpty: true,
      isDate: true
    },
    endDate: {
      notEmpty: true,
      isDate: true
    },
    channel: {
      optional: true,
      isString: true,
    }
  });

  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: errors });
  }

  const prefix = req.administrator.customer.prefix;
  const billingConf = config.get(`billing.${helpers.getConfigKey(prefix)}`);


  const startDate = utils.getStartDateInt(req.query.startDate);
  const endDate = utils.getEndDateInt(req.query.endDate);
  const limit = req.query.limit ? req.query.limit : 50;
  const offset = (req.query.offset) * limit;

  const requestUrl = req.query.channel ?
    `${billingConf.host}/jbilling/rest/subscription/getChannelSubscriptionHistory` : `${billingConf.host}/jbilling/rest/subscription/getAllChannelsSubscriptionHistory`;
  let queryString;

  if (req.query.channel) {
    queryString = {
      productName: req.query.channel,
      startDate,
      endDate,
      offset,
      limit
    };
  } else {
    queryString = {
      prefix,
      startDate,
      endDate,
      offset,
      limit
    };
  }

  request.get(requestUrl, {
    qs: queryString
  }, async (err, httpResponse, result) => {
    if (err) {
      global.log.error(err);
      return res.json({ err: true, err_msg: 'BILLING_SERVICE_NETWORK_ERROR' });
    }
    let records;
    try {
      records = JSON.parse(result);
    } catch (e) {
      global.log.error(e);
      global.log.error(result);
      return res.json({ err: true, err_msg: 'BILLING_SERVICE_ERROR', result });
    }

    const channels = records.reduce((acc, item) => {
      acc.push(item.roomName);
      return acc;
    }, []);
    const users = records.reduce((acc, item) => {
      acc.push(item.username);
      return acc;
    }, []);
    const channelWidthSubjectsAndUsers =
      await channelService.get.all.channelSubjectsAndEmailsOrNicknames(null,
        { channels, users, nickname: req.query.withNickname || false });

    const channelInfo = channelWidthSubjectsAndUsers.channels.reduce((acc, item) => {
      acc[item.roomName] = item.subject;
      return acc;
    }, {});

    const userInfo = channelWidthSubjectsAndUsers.users.reduce((acc, item) => {
      acc[item.username] = req.query.withNickname ? item.nickname : item.email;
      return acc;
    }, {});

    return res.json({ err: false, result: records || [], channelInfo, userInfo });
  });
});

router.get('/total', async (req, res) => {
  req.checkQuery({
    startDate: {
      notEmpty: true,
      isDate: true
    },
    endDate: {
      notEmpty: true,
      isDate: true
    },
    channel: {
      optional: true,
      isString: true,
    }
  });

  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: errors });
  }

  const prefix = req.administrator.customer.prefix;
  const billingConf = config.get(`billing.${helpers.getConfigKey(prefix)}`);


  const startDate = utils.getStartDateInt(req.query.startDate);
  const endDate = utils.getEndDateInt(req.query.endDate);

  const requestUrl = req.query.channel ?
    `${billingConf.host}/jbilling/rest/subscription/getChannelSubscriptionAmount` : `${billingConf.host}/jbilling/rest/subscription/getAllChannelsSubscriptionAmount`;
  let queryString;

  if (req.query.channel) {
    queryString = {
      productName: req.query.channel,
      startDate,
      endDate,
      currency: "USD"
    };
  } else {
    queryString = {
      prefix,
      startDate,
      endDate,
      currency: "USD"
    };
  }

  request.get(requestUrl, {
    qs: queryString
  }, async (err, httpResponse, result) => {
    if (err) {
      global.log.error(err);
      return res.json({ err: true, err_msg: 'BILLING_SERVICE_NETWORK_ERROR' });
    }
    let records;
    try {
      records = JSON.parse(result);
    } catch (e) {
      global.log.error(e);
      global.log.error(result);
      return res.json({ err: true, err_msg: 'BILLING_SERVICE_ERROR', result });
    }

    return res.json({ err: false, result: records.result });
  });
});

module.exports = router;
