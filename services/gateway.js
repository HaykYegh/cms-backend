const config = require('config');
const request = require('request');

const logger = require('./logger');
const helpers = require('../helpers');
const customerService = require('../services/customers');

const getConfig = helpers.billing.config;

const openFireConf = config.get('openFire');
const openFireHeader = { 'Content-Type': 'application/json', Authorization: openFireConf.secret };

function getGateway({ prefix, gatewayId, networkNickName }) {
  return new Promise((resolve, reject) => {
    const billingConf = getConfig({ prefix });
    if (!billingConf) {
      throw new Error('INVALID_BILLING_CONFIGURATION');
    }
    const requestUrl = `${billingConf.host}/jbilling/rest/gateway/getGateway`;
    const queryString = {
      prefix,
      reseller: networkNickName,
      id: gatewayId
    };
    request.get(requestUrl, {
      qs: queryString
    }, (err, httpResponse, result) => {
      if (err) {
        return reject(err);
      }
      let gateway;
      try {
        gateway = JSON.parse(result);
      } catch (e) {
        logger.error(e);
        logger.error(result);
        return reject(e);
      }
      if (gateway.error) {
        reject(result);
      } else {
        resolve(gateway.result);
      }
    });
  });
}


function getGateways({ prefix, networkNickName, offset = 0, limit = 1000 }) {
  console.log({ prefix, networkNickName, offset, limit });
  return new Promise((resolve, reject) => {
    const billingConf = getConfig({ prefix });
    if (!billingConf) {
      throw new Error('INVALID_BILLING_CONFIGURATION');
    }
    const requestUrl = `${billingConf.host}/jbilling/rest/gateway/getGateways`;
    const queryString = {
      prefix,
      reseller: networkNickName,
      start: offset,
      limit,
    };
    request.get(requestUrl, {
      qs: queryString
    }, (err, httpResponse, result) => {
      if (err) {
        return reject(err);
      }
      let gateways;
      try {
        gateways = JSON.parse(result);
      } catch (e) {
        logger.error(e);
        logger.error(result);
        return reject(e);
      }
      if (gateways.error) {
        reject(result);
      } else {
        resolve(gateways.result);
      }
    });
  });
}

function createGateway(params) {
  return new Promise((resolve, reject) => {
    const billingConf = getConfig({ prefix: params.prefix });
    if (!billingConf) {
      throw new Error('INVALID_BILLING_CONFIGURATION');
    }

    const { prefix, host, description, networkNickName, active } = params;
    const { param1, param2, dialPrefix, main, username, password } = params;

    const requestUrl = `${billingConf.host}/jbilling/rest/gateway/addNewGateway`;
    const qs = {
      id: 0,
      host,
      description,
      active,
      main: main || false,
      prefix,
      reseller: networkNickName,
      countries: params.countries.join(';'),
      username: username || '',
      password: password || '',
      type: 'MAIN',
      param1,
      param2,
      dialPrefix: dialPrefix || ''
    };

    request.get(requestUrl, {
      qs
    }, (err, httpResponse, result) => {
      if (err) {
        return reject(err);
      }
      let gateway;
      try {
        gateway = JSON.parse(result);
      } catch (e) {
        logger.error(e);
        logger.error(result);
        return reject(e);
      }
      if (gateway.error) {
        reject(result);
      } else {
        resolve(gateway.result);
      }
    });
  });
}


function updateGateway(params) {
  return new Promise((resolve, reject) => {
    const billingConf = getConfig({ prefix: params.prefix });
    if (!billingConf) {
      throw new Error('INVALID_BILLING_CONFIGURATION');
    }

    const { prefix, gatewayId, host, description, networkNickName, active } = params;
    const { param1, param2, dialPrefix, main, username, password } = params;

    const requestUrl = `${billingConf.host}/jbilling/rest/gateway/addNewGateway`;
    const qs = {
      id: gatewayId,
      host,
      description,
      active,
      main: main || false,
      prefix,
      reseller: networkNickName,
      countries: params.countries.join(';'),
      username: username || '',
      password: password || '',
      type: 'MAIN',
      param1,
      param2,
      dialPrefix: dialPrefix || ''
    };

    request.get(requestUrl, {
      qs
    }, (err, httpResponse, result) => {
      if (err) {
        return reject(err);
      }
      let gateway;
      try {
        gateway = JSON.parse(result);
      } catch (e) {
        logger.error(e);
        logger.error(result);
        return reject(e);
      }
      if (gateway.error) {
        reject(result);
      } else {
        resolve(gateway.result);
      }
    });
  });
}


function getSIPHealth(params) {
  const { host, username = '', password = '', dialPrefix = '', callee, caller } = params;
  const qs = {
    gateway_host: host,
    callee,
    dial_prefix: dialPrefix,
    caller
  };
  if (username !== '') {
    qs.gateway_username = username;
  }
  if (password !== '') {
    qs.gateway_password = password;
  }
  return new Promise((resolve, reject) => {
    request.get(`${openFireConf.host}/plugins/zangitest/gateway`,
      {
        qs,
        headers: openFireHeader
      },
      (err, httpResponse, result) => {
        if (err) {
          logger.error(err);
          return reject(err);
        }
        let health;
        try {
          health = JSON.parse(result);
        } catch (e) {
          logger.error(e);
          logger.error(result);
          return reject(e);
        }
        if (health.error) {
          reject(health);
        } else {
          resolve(health);
        }
      });
  });
}


function deleteGateway(params) {
  return new Promise((resolve, reject) => {
    const billingConf = getConfig({ prefix: params.prefix });
    if (!billingConf) {
      throw new Error('INVALID_BILLING_CONFIGURATION');
    }
    const { gatewayId, networkNickName } = params;

    const requestUrl = `${billingConf.host}/jbilling/rest/gateway/deleteGateway`;
    const qs = {
      id: gatewayId,
      reseller: networkNickName,
    };
    request.get(requestUrl, {
      qs
    }, (err, httpResponse, result) => {
      if (err) {
        return reject(err);
      }
      let gateway;
      try {
        gateway = JSON.parse(result);
      } catch (e) {
        logger.error(e);
        logger.error(result);
        return reject(e);
      }
      if (gateway.error) {
        reject(result);
      } else {
        resolve(gateway.result);
      }
    });
  });
}


function updateNetworkGatewaysStatus({ customerId, nickname, suspend }) {
  logger.info(`>_: ATTEMPT CHANGE GATEWAY STATUS TO = ${suspend}`);
  return new Promise((resolve, reject) => {
    const billingConf = helpers.billing.config({ customerId });
    const { prefix } = customerService.get.customerId(customerId);
    const requestUrl = `${billingConf.host}/jbilling/rest/gateway/suspend`;
    const qs = {
      reseller: nickname,
      suspend,
      prefix
    };
    request.get(requestUrl, {
      qs
    }, (err, httpResponse, billingResult) => {
      if (err) {
        logger.error(err);
        return reject(err);
      }
      let result;
      try {
        result = JSON.parse(billingResult);
      } catch (e) {
        logger.error(result);
        return reject(e);
      }
      if (result.error) {
        logger.error(result);
        reject(result);
      } else {
        resolve(result);
      }
    });
  });
}


module.exports = {
  fetchOne: getGateway,
  fetchAll: getGateways,
  healthCheck: getSIPHealth,
  create: createGateway,
  update: updateGateway,
  delete: deleteGateway,
  updateNetworkGatewaysStatus
};
