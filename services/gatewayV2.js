const config = require('config');
const request = require('request');
const querystring = require('querystring');

const logger = require('./logger');
const helpers = require('../helpers');
const customerService = require('../services/customers');
const redisService = require('../services/redis');

const getConfig = helpers.billing.config;

const openFireConf = config.get('openFire');
const openFireHeader = { 'Content-Type': 'application/json', Authorization: openFireConf.secret };

function getGateway(params) {
  return new Promise((resolve, reject) => {
    const { customerId, gatewayId, network = '', userGroupId = '' } = params;
    const { prefix } = customerService.get.customerId(customerId);

    const billingConf = getConfig({ prefix });
    if (!billingConf) {
      throw new Error('INVALID_BILLING_CONFIGURATION');
    }
    const requestUrl = `${billingConf.host}/jbilling/rest/gateway/getGateway`;

    let reseller = '';

    if (network !== '') {
      reseller = network;
    } else if (userGroupId !== '') {
      reseller = userGroupId;
    }
    const queryString = {
      prefix,
      reseller,
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


function getGateways(params) {
  return new Promise((resolve, reject) => {
    const { customerId, network = '', userGroupId = '', offset = 0, limit = 1000 } = params;
    const { prefix } = customerService.get.customerId(customerId);


    let reseller = '';

    if (network !== '') {
      reseller = network;
    } else if (userGroupId !== '') {
      reseller = userGroupId;
    }

    const billingConf = getConfig({ prefix });
    if (!billingConf) {
      throw new Error('INVALID_BILLING_CONFIGURATION');
    }
    const requestUrl = `${billingConf.host}/jbilling/rest/gateway/getGateways`;
    const queryString = {
      prefix,
      reseller,
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
    const { customerId, host, description, network = '', userGroupId = '', active, voipModuleAddress } = params;
    const { param1, param2, dialPrefix, main = false, username, password } = params;
    const { callerDialPrefix, callerCutDigitCount, calleeCutDigitCount } = params;

    const { prefix } = customerService.get.customerId(customerId);

    const billingConf = getConfig({ prefix });
    if (!billingConf) {
      throw new Error('INVALID_BILLING_CONFIGURATION');
    }

    let reseller = null;

    if (network !== '') {
      reseller = network;
    } else if (userGroupId !== '') {
      reseller = +userGroupId === -1 ? '' : userGroupId;
    }

    const requestUrl = `${billingConf.host}/jbilling/rest/gateway/addNewGateway`;
    const qs = {
      id: 0,
      host,
      description,
      active,
      main,
      prefix,
      reseller,
      countries: params.countries,
      username,
      password,
      type: 'MAIN',
      param1,
      param2,
      dialPrefix,
      callerDialPrefix,
      callerCutDigitCount,
      calleeCutDigitCount,
      voipModuleAddress
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
    console.log(params);


    const { customerId, gatewayId, host, description, network = '', userGroupId = '', active, voipModuleAddress } = params;
    const { param1, param2, dialPrefix, main = false, username, password } = params;
    const { callerDialPrefix, callerCutDigitCount, calleeCutDigitCount } = params;

    const { prefix } = customerService.get.customerId(customerId);

    const billingConf = getConfig({ prefix });
    if (!billingConf) {
      throw new Error('INVALID_BILLING_CONFIGURATION');
    }

    let reseller = '';

    if (network !== '') {
      reseller = network;
    } else if (userGroupId !== '') {
      reseller = +userGroupId === -1 ? '' : userGroupId;
    }

    const requestUrl = `${billingConf.host}/jbilling/rest/gateway/addNewGateway`;
    const qs = {
      id: gatewayId,
      host,
      description,
      active,
      main,
      prefix,
      reseller,
      countries: params.countries,
      username,
      password,
      type: 'MAIN',
      param1,
      param2,
      dialPrefix,
      callerDialPrefix,
      callerCutDigitCount,
      calleeCutDigitCount,
      voipModuleAddress
    };
    console.log(qs);

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
    const { customerId, gatewayId, network = '', userGroupId = '' } = params;
    const { prefix } = customerService.get.customerId(customerId);

    const billingConf = getConfig({ prefix });
    if (!billingConf) {
      throw new Error('INVALID_BILLING_CONFIGURATION');
    }


    let reseller = '';
    if (network !== '') {
      reseller = network;
    } else if (userGroupId !== '') {
      reseller = userGroupId;
    }
    const requestUrl = `${billingConf.host}/jbilling/rest/gateway/deleteGateway`;
    const qs = {
      id: gatewayId,
      reseller,
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


function cachePrices(params) {
  return new Promise((resolve, reject) => {
    const { customerId, network = '', userGroupId = '' } = params;
    const { prefix } = customerService.get.customerId(customerId);

    const billingConf = getConfig({ prefix });
    if (!billingConf) {
      throw new Error('INVALID_BILLING_CONFIGURATION');
    }

    let reseller = '';
    if (network !== '') {
      reseller = network;
    } else if (userGroupId !== '') {
      reseller = userGroupId;
    }
    request.get(`${billingConf.host}/jbilling/rest/json/getPrices`, {
      qs: {
        prefix,
        type: 'MAIN',
        reseller
      }
    }, (err, httpResponse, result) => {
      if (err) {
        logger.error(err);
        return reject(err);
      }
      let reply;
      try {
        reply = JSON.parse(result);
      } catch (err) {
        logger.error(result);
        logger.error(err);
        return reject(result);
      }

      if (reply.length === 0) {
        return reject('EMPTY_PRICES');
      }

      const priceList = {};

      // eslint-disable-next-line no-restricted-syntax
      for (const priceItem of reply) {
        const item = { ...priceItem };
        if (!item.landline) {
          item.landline = 0;
        }
        if (!item.mobile) {
          item.mobile = 0;
        }

        const landlinePrices = [];
        const mobilePrices = [];

        try {
          for (let j = 0; j < item.prices.length; j++) {
            const price = item.prices[j];
            if (price.destination && price.destination.toLowerCase().includes('fix')) {
              landlinePrices.push(+price.price);
            } else {
              mobilePrices.push(+price.price);
            }
          }
        } catch (e) {
          console.log(e);
        }

        item.landline = landlinePrices.length === 0 ? 0 : Math.min(...landlinePrices);
        item.mobile = mobilePrices.length === 0 ? 0 : Math.min(...mobilePrices);

        priceList[item.code] = JSON.stringify(item);
      }

      let priceHashName = `${redisService.CONSTANTS.HASH.CALL_PRICES}#${prefix}`;

      if (reseller !== '') {
        priceHashName = `${priceHashName}#${userGroupId}`;
      }

      (async () => {
        try {
          await redisService.commands.hmset(priceHashName, priceList);
          resolve('OK');
        } catch (e) {
          reject(e);
        }
      })();
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

function getBackTerminationPrice(params) {
  return new Promise((resolve, reject) => {
    const { customerId, userGroupId } = params;

    const billingConf = helpers.billing.config({ customerId });
    const { prefix } = customerService.get.customerId(customerId);
    const qs = {
      reseller: +userGroupId === -1 ? null : userGroupId,
      prefix
    };
    request.get(`${billingConf.host}/jbilling/rest/gateway/backCallPrice`, {
      qs
    }, (err, httpResponse, result) => {
      if (err) {
        logger.error(err);
        return reject(err);
      }
      let reply;
      try {
        reply = JSON.parse(result);
      } catch (e) {
        logger.error(result);
        return reject(e);
      }
      if (reply.error) {
        logger.error(result);
        reject(result);
      } else {
        resolve(reply);
      }
    });
  });
}


function updateBackTerminationPrice(params) {
  return new Promise((resolve, reject) => {
    const { customerId, userGroupId, amount } = params;
    const billingConf = helpers.billing.config({ customerId });
    const { prefix } = customerService.get.customerId(customerId);
    const data = querystring.stringify({
      reseller: +userGroupId === -1 ? null : userGroupId,
      prefix,
      amount
    });
    request.post(`${billingConf.host}/jbilling/rest/gateway/backCallPrice`, {
      form: data
    }, (err, httpResponse, result) => {
      if (err) {
        logger.error(err);
        return reject(err);
      }
      let reply;
      try {
        reply = JSON.parse(result);
      } catch (e) {
        logger.error(result);
        return reject(e);
      }
      if (reply.error) {
        logger.error(result);
        reject(result);
      } else {
        resolve(reply);
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
  updateNetworkGatewaysStatus,
  gateways: {
    list: {
      gateways: getGateways
    },
    retrieve: {
      gateway: getGateway,
      backTerminationPrice: getBackTerminationPrice
    },
    delete: {
      gateway: deleteGateway
    },
    update: {
      gateway: updateGateway,
      gatewayStatus: updateNetworkGatewaysStatus,
      backTerminationPrice: updateBackTerminationPrice

    },
    create: {
      gateway: createGateway
    },
    cache: {
      prices: cachePrices
    },
    healthCheck: getSIPHealth
  }
};
