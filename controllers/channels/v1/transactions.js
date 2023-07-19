const express = require('express');
const config = require('config');
const request = require('request');
const utils = require('../../../helpers/utils');
const helpers = require('../../../helpers');
const logger = require('../../../services/logger');

const channelService = require('../../../services/channel');
const emailService = require('../../../services/email');


const router = express.Router();

/*
 * URL: /channels/v1/transactions
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
    }
  });

  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: errors });
  }
  const prefix = req.admin.customer.prefix;
  const billingConf = config.get(`billing.${helpers.getConfigKey(prefix)}`);


  const requestUrl = `${billingConf.host}/jbilling/rest/subscription/getChannelSubscriptionHistory`;

  const startDate = utils.getStartDateInt(req.query.startDate);
  const endDate = utils.getEndDateInt(req.query.endDate);
  const limit = req.query.limit ? req.query.limit : 50;
  const offset = (req.query.offset) * limit;
  const productName = req.channelId;

  const queryString = {
    productName,
    startDate,
    endDate,
    offset,
    limit
  };
  logger.info(queryString);
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
      logger.info(records);
    } catch (e) {
      global.log.error(e);
      global.log.error(result);
      return res.json({ err: true, err_msg: 'BILLING_SERVICE_ERROR', result });
    }

    const users = records.reduce((acc, item) => {
      acc.push(item.username);
      return acc;
    }, []);

    let channelWidthEmailsOrNicknames;

    if (req.query.withNickname) {
      channelWidthEmailsOrNicknames = await channelService.get.all.channelNicknames(null, { users });
    } else {
      channelWidthEmailsOrNicknames = await channelService.get.all.channelEmails(null, { users });
    }

    const userInfo = channelWidthEmailsOrNicknames.reduce((acc, item) => {
      acc[item.username] = req.query.withNickname ? item.nickname : item.email;
      return acc;
    }, {});

    return res.json({ err: false, result: records || [], userInfo });
  });
});

router.post('/send', async (req, res) => {
  try {
    req.checkBody({
      amount: {
        notEmpty: true,
        isString: true
      },
      message: {
        notEmpty: false,
        isString: true
      }
    });

    const errors = req.validationErrors(true);
    if (errors) {
      return res.json({ err: true, err_msg: errors });
    }
    const { amount, message } = req.body;
    const prefix = req.admin.customer.prefix;
    const subject = 'Monthly withdrawal';
    const messageText = `
      <div>Amount - ${amount} USD</div>
      ${message}
    `;

    await emailService.sendMail(prefix)({ to: 'val@theello.com', subject, message: messageText });
    return res.json({ err: false, result: true });
  } catch (e) {
    return res.json({ err: true, result: e });
  }
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
    }
  });

  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: errors });
  }
  const prefix = req.admin.customer.prefix;
  const billingConf = config.get(`billing.${helpers.getConfigKey(prefix)}`);


  const requestUrl = `${billingConf.host}/jbilling/rest/subscription/getChannelSubscriptionAmount`;

  const startDate = utils.getStartDateInt(req.query.startDate);
  const endDate = utils.getEndDateInt(req.query.endDate);
  const productName = req.channelId;
  const currency = 'USD';

  const queryString = {
    productName,
    startDate,
    endDate,
    currency
  };

  logger.info(queryString);
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
      logger.info(records);
    } catch (e) {
      global.log.error(e);
      global.log.error(result);
      return res.json({ err: true, err_msg: 'BILLING_SERVICE_ERROR', result });
    }

    return res.json({ err: false, result: records.result });
  });
});

module.exports = router;
