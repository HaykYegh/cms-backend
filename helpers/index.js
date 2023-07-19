const config = require('config');
const constants = require('./constants');
const customerService = require('../services/customers');
const logger = require('../services/logger');

function getConfigKey(prefix) {
  const customer = customerService.getCustomers().getValue(prefix);

  try {
    switch (customer.packageId) {
      case 4:
        return constants.ZANGI_BUSINESS.CONFIG_KEY;
      default:
        return prefix;
    }
  } catch (e) {
    logger.error(e);
    return undefined;
  }
}

function getBillingConfig({ customerId, prefix }) {
  if (customerId) {
    const customer = customerService.get.customerId(customerId);
    const prefix = customer.prefix;
    try {
      return config.get(`billing.${getConfigKey(prefix)}`);
    } catch (e) {
      logger.error(e);
      return undefined;
    }
  }
  try {
    return config.get(`billing.${getConfigKey(prefix)}`);
  } catch (e) {
    logger.error(e);
    return undefined;
  }
}

module.exports = {
  getConfigKey,
  billing: {
    config: getBillingConfig
  },
};
