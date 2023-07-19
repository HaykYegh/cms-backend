const constants = require('../helpers/constants');
const networkService = require('../services/network');
const logger = require('../services/logger');


module.exports = async (req, res, next) => {
  req.checkHeaders({
    'X-Consumer-Secret': {
      notEmpty: true,
      isString: true,
    },
    'X-Customer-Id': {
      optional: true,
      isNumber: true
    },
  });
  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ error: true, errorMessage: 'VALIDATION_ERROR', result: errors });
  }

  const customerId = req.headers['X-Customer-Id'] || constants.CUSTOMERS.ZANGI;
  req.customerId = customerId;

  const consumerSecret = req.headers['x-consumer-secret'];
  try {
    const result = await networkService
      .retrieve
      .consumer(null, {
        customerId, consumerSecret
      });
    const { networkConsumerId = null, networkId, admins } = result;
    if (!networkConsumerId) {
      return res.json({ error: true, errorMessage: 'INVALID_SECRET' });
    }

    if (!admins || admins.length === 0) {
      res.json({ error: true, errorMessage: 'INVALID_NETWORK_ADMINS' });
    }
    req.consumerId = networkConsumerId;
    req.networkId = networkId;
    req.adminId = admins[0].adminId;
    next();
  } catch (e) {
    logger.error(e);
    res.json({ error: true, errorMessage: 'INVALID_CONSUMER' });
  }
};
