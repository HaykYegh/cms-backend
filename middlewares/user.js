const config = require('config');
const jwt = require('jsonwebtoken');
const customerService = require('../services/customers');
const helpers = require('../helpers');

module.exports = (req, res, next) => {
  req.checkHeaders({
    'x-access-id': {
      notEmpty: true,
    },
    'x-access-token': {
      notEmpty: true,
    },
    'x-access-prefix': {
      notEmpty: true,
      isValidPrefix: true
    }
  });
  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: errors });
  }
  const administratorId = parseInt(req.headers['x-access-id'], 10);
  const token = req.headers['x-access-token'];
  const prefix = req.headers['x-access-prefix'];
  const jwtSecret = config.get(`jwt.${helpers.getConfigKey(prefix)}.secret`);

  jwt.verify(token, jwtSecret, (err, administrator) => {
    if (err) {
      return res.json(403, { err: true, err_msg: 'INVALID_TOKEN' });
    }
    if (administrator) {
      if (administrator.administratorId !== administratorId) {
        return res.json(403, { err: true, err_msg: 'UNKNOWN_TOKEN' });
      }
      const customerId = administrator.customerId;
      if (administrator.customer.prefix !== prefix) {
        return req.json(403, { err: true, err_msg: 'PREFIX_NOT_MATCH' });
      }
      if (!customerService.getCustomers().hasId(customerId)) {
        return res.json(403, { err: true, err_msg: 'INVALID_CUSTOMER' });
      }

      req.network = {};
      if (administrator.network) {
        req.network = administrator.network;
      }

      req.administrator = administrator;
      req.admin = administrator;
      req.administratorId = administrator.administratorId;
      req.adminId = administrator.administratorId;
      req.customerId = customerId;
      return next();
    }
    return res.json(403, { err: true, err_msg: 'INVALID_USER' });
  });
};


module.exports.authMiddleware = (req, res, next) => {
  req.checkHeaders({
    'x-access-prefix': {
      optional: true,
      isValidPrefix: true
    }
  });
  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: errors });
  }
  next();
};

module.exports.checkVirtualNetwork = (req, res, next) => {
  if (req.network) {
    return res.json(403, { err: true, err_msg: 'FORBIDDEN' });
  }
  next();
};
