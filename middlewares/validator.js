const config = require('config');
const expressValidator = require('express-validator');
const _ = require('lodash');
const { INFO_TYPE: { USERS } } = require('../helpers/constants');
const { getCustomers } = require('../services/customers');
const metricService = require('../services/metrics');

module.exports = expressValidator({
  customValidators: {
    isObject(property) {
      return _.isPlainObject(property);
    },
    isString(property) {
      return _.isString(property);
    },
    isArray(property) {
      return _.isArray(property);
    },
    isNumber(property) {
      try {
        const number = parseInt(property, 10);
        if (!isNaN(number)) {
          return _.isNumber(number);
        }
        return false;
      } catch (e) {
        return false;
      }
    },
    isFloatNumber(property) {
      try {
        const number = parseFloat(property, 10);
        if (!isNaN(number)) {
          return _.isNumber(number);
        }
        return false;
      } catch (e) {
        return false;
      }
    },
    isUsersInfoType(property) {
      return Object.keys(USERS).map(type => USERS[type]).includes(property);
    },
    isResourceToken(property) {
      return property === config.get('app.system.resource.token');
    },
    isUUID_v4(property) {
      return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(property);
    },
    isBoolean(property) {
      if (typeof property === 'string') {
        return (property === 'true' || property === 'false');
      }
      return _.isBoolean(property);
    },
    isValidPrefix(property) {
      return getCustomers().hasPrefix(property);
    },
    isDate(property) {
      try {
        return new Date(property).getTime() > 0;
      } catch (e) {
        return false;
      }
    },
    isMetricType(property) {
      return metricService.metricTypes.hasType(property);
    },
  }
});

