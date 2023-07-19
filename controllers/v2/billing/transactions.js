const express = require('express');
const config = require('config');
const request = require('request');
const helpers = require('../../../helpers');
const utils = require('../../../helpers/utils');
const logger = require('../../../services/logger');
const channelService = require('../../../services/channel');
const paymentService = require('../../../services/payment');

const router = express.Router();

/*
 * URL: /v2/billing/transactions
 * METHOD: GET
 * Description: Get top up transactions
 */
router.get('/', async (req, res) => {
  req.checkQuery({
    offset: {
      notEmpty: true,
      isNumber: true
    },
    startDate: {
      notEmpty: true,
      isDate: true
    },
    endDate: {
      notEmpty: true,
      isDate: true
    },
    virtualNetwork: {
      optional: true
    },
    regionCode: {
      optional: true
    },
    currency: {
      optional: true,
      isString: true,
    },
    method: {
      notEmpty: true
    },
    limit: {
      optional: true,
      isNumber: true,
    },
    username: {
      optional: true,
      isString: true,
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

  const requestUrl = `${billingConf.host}/jbilling/rest/analytics/payment/getPaymentsJson`;
  const requestUrlWidthChannel = `${billingConf.host}/jbilling/rest/analytics/payment/getChannelUserPayments`;

  const offset = req.query.offset;
  const regionCode = req.query.regionCode;
  const startDate = utils.getStartDateInt(req.query.startDate);
  const endDate = utils.getEndDateInt(req.query.endDate);
  const method = req.query.method.toUpperCase();
  const currency = req.query.currency || '';
  const limit = req.query.limit ? req.query.limit : 50;
  const userGroupId = req.query.userGroupId;
  const channel = req.query.channel || '';
  const withNickname = req.query.withNickname || false

  let username;

  if (req.query.username) {
    if (Number(req.query.username)) {
      username = prefix + req.query.username;
    } else {
      const users =
        await paymentService.usersWidthUsernames(null,
          { email: req.query.username, customerId: req.customerId });

      if (users[0]) {
        username = users[0].username;
      } else {
        username = req.query.username;
      }
    }
  } else {
    username = '';
  }

  if (channel) {
    const usernames = await channelService.get.all.channelUsers(null, { channel });
    let usernameList = usernames.reduce((acc, item) => {
      acc.push(item.username);
      return acc;
    }, []);
    if (username) {
      if (usernameList.includes(username)) {
        usernameList = [username];
      } else {
        usernameList = [];
      }
    }
    const queryStringWidthChannel = {
      prefix,
      paymentMethod: method,
      country: regionCode || '',
      usernameList,
      startDate,
      endDate,
      offset,
      limit,
      count: false
    };
    const options = {
      url: requestUrlWidthChannel,
      json: true,
      body: queryStringWidthChannel
    };
    request.post(options, async (err, httpResponse, result) => {
      if (err) {
        global.log.error(err);
        return res.json({ err: true, err_msg: 'BILLING_SERVICE_NETWORK_ERROR' });
      }

      let users = [];
      if (result.result) {
        users = result.result.reduce((acc, item) => {
          acc.push(item.roomName);
          return acc;
        }, []);
      }

      const saleUsers = withNickname ? await paymentService.usersWidthNicknames(null, { users }) :
        await paymentService.usersWidthEmails(null, { users });

      const userInfo = saleUsers.reduce((acc, item) => {
        acc[item.username] = withNickname ? item.nickname : item.email;
        return acc;
      }, {});

      return res.json({ err: false, result, userInfo });
    });
  } else {
    const queryString = {
      prefix,
      startDate,
      endDate,
      reseller: userGroupId || '',
      paymentMethod: method,
      country: regionCode || '',
      start: offset,
      limit,
      currency,
      username
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
      } catch (e) {
        global.log.error(e);
        global.log.error(result);
        return res.json({ err: true, err_msg: 'BILLING_SERVICE_ERROR', result });
      }

      const users = records.result.reduce((acc, item) => {
        acc.push(item.userName);
        return acc;
      }, []);

      const saleUsers = withNickname ? await paymentService.usersWidthNicknames(null, { users }) :
        await paymentService.usersWidthEmails(null, { users });

      const userInfo = saleUsers.reduce((acc, item) => {
        acc[item.username] = withNickname ? item.nickname : item.email;
        return acc;
      }, {});

      return res.json({ err: false, result: records.result || [], userInfo });
    });
  }
});

/*
 * URL: /v2/billing/transactions/count
 * METHOD: GET
 * Description: Get top up transaction count
 */
router.get('/count', async (req, res) => {
  req.checkQuery({
    startDate: {
      notEmpty: true,
      isDate: true
    },
    endDate: {
      notEmpty: true,
      isDate: true
    },
    virtualNetwork: {
      optional: true
    },
    regionCode: {
      optional: true
    },
    username: {
      optional: true,
      isString: true
    },
    userGroupId: {
      optional: true,
      isString: true
    },
    method: {
      notEmpty: true
    },
    channel: {
      optional: true,
      isString: true
    }
  });

  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: errors });
  }

  const prefix = req.administrator.customer.prefix;
  const billingConf = config.get(`billing.${helpers.getConfigKey(prefix)}`);

  const requestUrl = `${billingConf.host}/jbilling/rest/analytics/payment/getPaymentCountJson`;
  const requestUrlWidthChannel = `${billingConf.host}/jbilling/rest/analytics/payment/getChannelUserPayments`;

  const startDate = utils.getStartDateInt(req.query.startDate);
  const endDate = utils.getEndDateInt(req.query.endDate);
  // const virtualNetwork = req.network.name || '';
  const regionCode = req.query.regionCode;
  const method = req.query.method.toUpperCase();
  const userGroupId = req.query.userGroupId;
  const channel = req.query.channel || '';

  let username;

  if (req.query.username) {
    if (Number(req.query.username)) {
      username = prefix + req.query.username;
    } else {
      const users =
        await paymentService.usersWidthUsernames(null,
          { email: req.query.username, customerId: req.customerId });
      if (users[0]) {
        username = users[0].username;
      } else {
        username = req.query.username;
      }
    }
  } else {
    username = '';
  }

  if (channel) {
    const usernames = await channelService.get.all.channelUsers(null, { channel });
    let usernameList = usernames.reduce((acc, item) => {
      acc.push(item.username);
      return acc;
    }, []);
    if (username) {
      if (usernameList.includes(username)) {
        usernameList = [username];
      } else {
        usernameList = [];
      }
    }
    const queryStringWidthChannel = {
      prefix,
      paymentMethod: method,
      country: regionCode || '',
      usernameList,
      startDate,
      endDate,
      offset: 0,
      limit: 1000000,
      count: true
    };
    const options = {
      url: requestUrlWidthChannel,
      json: true,
      body: queryStringWidthChannel
    };
    request.post(options, (err, httpResponse, result) => {
      if (err) {
        global.log.error(err);
        return res.json({ err: true, err_msg: 'BILLING_SERVICE_NETWORK_ERROR' });
      }

      return res.json({ err: false, result });
    });
  } else {
    const queryString = {
      prefix,
      startDate,
      endDate,
      reseller: userGroupId || '',
      paymentMethod: method,
      country: regionCode || '',
      username
    };

    console.log('### count  #####');
    console.log(queryString);
    console.log('### count  end #####');
    request.get(requestUrl, {
      qs: queryString
    }, (err, httpResponse, result) => {
      if (err) {
        global.log.error(err);
        return res.json({ err: true, err_msg: 'BILLING_SERVICE_NETWORK_ERROR' });
      }
      let record;
      try {
        record = JSON.parse(result);
      } catch (e) {
        global.log.error(e);
        global.log.error(result);
        return res.json({ err: true, err_msg: 'BILLING_SERVICE_ERROR', result });
      }
      return res.json({ err: false, result: record.result || [] });
    });
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
    },
    currency: {
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

  const requestUrl = `${billingConf.host}/jbilling/rest/analytics/payment/getTotal`;

  const regionCode = req.query.regionCode;
  const startDate = utils.getStartDateInt(req.query.startDate);
  const endDate = utils.getEndDateInt(req.query.endDate);
  const currency = req.query.currency || '';


  const queryString = {
    prefix,
    startDate,
    endDate,
    currency,
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
    } catch (e) {
      global.log.error(e);
      global.log.error(result);
      return res.json({ err: true, err_msg: 'BILLING_SERVICE_ERROR', result });
    }

    return res.json({ err: false, result: records.result });
  });
});

module.exports = router;
