const config = require('config');
const jwt = require('jsonwebtoken');
const customerService = require('../services/customers');


module.exports = (req, res, next) => {
  req.checkCookies({
    authentication: {
      notEmpty: true,
    }
  });
  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ error: true, errorMessage: 'VALIDATION_ERROR', result: errors });
  }
  const authenticationToken = req.cookies.authentication;
  jwt.verify(authenticationToken, config.get('jsonWebToken.secret'), (err, admin) => {
    if (err) {
      return res.status(401).json({ err: true, err_msg: 'INVALID_TOKEN' });
    }
    if (admin) {
      if (!admin.customer) {
        return res.status(401).json({ err: true, err_msg: 'INVALID_CUSTOMER' });
      }
      if (!admin.network) {
        return res.status(401).json({ err: true, err_msg: 'INVALID_NETWORK' });
      }
      req.admin = admin;
      req.customer = admin.customer;
      req.network = admin.network;
      req.adminId = admin.administratorId;
      req.customerId = admin.customer.customerId;
      req.networkId = admin.network.networkId;
      return next();
    }
    return res.status(401).json({ err: true, err_msg: 'INVALID_ADMIN' });
  });
};

module.exports.authMiddleware = (req, res, next) => {
  req.checkHeaders({
    'x-access-prefix': {
      notEmpty: true,
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
