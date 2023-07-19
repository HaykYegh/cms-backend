const request = require('request');
const helpers = require('../helpers');
const logger = require('./logger');
const customerService = require('./customers');

const getConfig = helpers.billing.config;


function getExchange(prefix, currency) {
  return (callback) => {
    const billingConf = getConfig({ prefix });
    if (!billingConf) {
      throw new Error('INVALID_BILLING_CONFIGURATION');
    }

    const requestURL = `${billingConf.host}/jbilling/rest/json/getExchangeRate`;
    request.get(requestURL, {
      qs: {
        currency
      }
    }, (err, httpResponse, result) => {
      if (err) {
        global.log.error(err);
        return callback(null, 0);
      }
      let exchange;
      try {
        exchange = JSON.parse(result);
      } catch (err) {
        global.log.error(err);
        return callback(null, 0);
      }
      callback(null, exchange);
    });
  };
}


function getCurrentRate({ prefix, currency }) {
  return new Promise((resolve) => {
    const billingConf = getConfig({ prefix });

    if (!billingConf) {
      throw new Error('INVALID_BILLING_CONFIGURATION');
    }

    const requestURL = `${billingConf.host}/jbilling/rest/json/getExchangeRate`;
    request.get(requestURL, {
      qs: {
        currency
      }
    }, (err, httpResponse, result) => {
      if (typeof result === 'number') {
        return resolve(result);
      }
      if (err) {
        logger.error(err);
        return resolve(0);
      }
      let exchange;
      try {
        exchange = JSON.parse(result);
      } catch (err) {
        logger.error(err);
        return resolve(0);
      }
      resolve(exchange);
    });
  });
}


function getCallRecords(params) {
  return new Promise((resolve, reject) => {
    const { prefix } = params;
    const billingConf = getConfig({ prefix });

    if (!billingConf) {
      throw new Error('INVALID_BILLING_CONFIGURATION');
    }

    const { networkNickName, fromCountry, toCountry, startDate, endDate } = params;
    const { offset, limit, callType, currency, username } = params;
    const qs = {
      prefix,
      startDate,
      endDate,
      reseller: networkNickName || '',
      fromCountry: fromCountry || '',
      toCountry,
      start: offset,
      limit,
      callType,
      currency,
      username
    };
    logger.info(qs);
    request.get(`${billingConf.host}/jbilling/rest/analytics/call/getCalls`, {
      qs
    }, (err, httpResponse, result) => {
      if (err) {
        logger(err);
        return reject(err);
      }
      let callHistory;
      try {
        callHistory = JSON.parse(result);
      } catch (e) {
        logger.error(e);
        logger.error(result);
        return reject(result);
      }
      resolve(callHistory);
    });
  });
}

function getCallRecordsCount(params) {
  return new Promise((resolve, reject) => {
    const { prefix } = params;
    const billingConf = getConfig({ prefix });

    if (!billingConf) {
      throw new Error('INVALID_BILLING_CONFIGURATION');
    }

    const { networkNickName, fromCountry, toCountry, startDate, endDate } = params;
    const { callType, currency, username } = params;
    const qs = {
      prefix,
      startDate,
      endDate,
      reseller: networkNickName || '',
      fromCountry: fromCountry || '',
      toCountry,
      callType,
      currency,
      username
    };
    logger.info(qs);
    request.get(`${billingConf.host}/jbilling/rest/analytics/call/getCallsAmount`, {
      qs
    }, (err, httpResponse, result) => {
      if (err) {
        logger(err);
        return reject(err);
      }
      let callHistoryCount;
      try {
        callHistoryCount = JSON.parse(result).result;
      } catch (e) {
        logger.error(e);
        logger.error(result);
        return reject(result);
      }
      resolve(callHistoryCount);
    });
  });
}


function getCallList(params) {
  return new Promise((resolve, reject) => {
    const { customerId } = params;
    const billingConf = getConfig({ customerId });

    if (!billingConf) {
      throw new Error('INVALID_BILLING_CONFIGURATION');
    }

    const {
      startDate,
      endDate,
      limit,
      offset,
      fromCountry,
      toCountry,
      currency,
      callType,
      number,
      userGroupId,
      network,
      statusCode,
      voipModuleAddress,
      sipAddress
    } = params;

    const { prefix } = customerService.get.customerId(customerId);
    const username = number ? prefix + number : '';

    const qs = {
      prefix,
      startDate,
      endDate,
      reseller: network || userGroupId || '',
      fromCountry,
      toCountry,
      start: offset,
      limit,
      callType,
      currency,
      username,
      endReason: statusCode,
      voipModuleAddress,
      sipAddress
    };
    request.get(`${billingConf.host}/jbilling/rest/analytics/call/getCalls`, {
      qs
    }, (err, httpResponse, result) => {
      if (err) {
        console.error(err);
        return reject(err);
      }
      let reply;
      try {
        reply = JSON.parse(result);
      } catch (e) {
        console.error(result);
        return reject(result);
      }
      if (reply.error) {
        reject(reply);
      } else {
        resolve(reply.result);
      }
    });
  });
}

function getCallCount(params) {
  return new Promise((resolve, reject) => {
    const { customerId } = params;
    const billingConf = getConfig({ customerId });

    if (!billingConf) {
      throw new Error('INVALID_BILLING_CONFIGURATION');
    }

    const {
      startDate,
      endDate,
      fromCountry,
      toCountry,
      currency,
      callType,
      number,
      userGroupId,
      network,
      statusCode,
      voipModuleAddress,
      sipAddress
    } = params;

    const { prefix } = customerService.get.customerId(customerId);
    const username = number ? prefix + number : '';

    const qs = {
      prefix,
      startDate,
      endDate,
      reseller: network || userGroupId || '',
      fromCountry,
      toCountry,
      callType,
      currency,
      username,
      endReason: statusCode,
      voipModuleAddress,
      sipAddress
    };
    request.get(`${billingConf.host}/jbilling/rest/analytics/call/getCallsAmount`, {
      qs
    }, (err, httpResponse, result) => {
      if (err) {
        return reject(err);
      }
      let reply;
      try {
        reply = JSON.parse(result);
      } catch (e) {
        return reject(result);
      }

      if (reply.error) {
        reject(reply);
      } else {
        resolve(reply.result);
      }
    });
  });
}

module.exports = {
  getExchange, // deprecated
  getCurrentRate, // deprecated
  call: { // deprecated
    records: getCallRecords, // deprecated
    count: getCallRecordsCount // deprecated
  }, // deprecated
  list: {
    calls: getCallList,
  },
  count: {
    calls: getCallCount,
  }
};
