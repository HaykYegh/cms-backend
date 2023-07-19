const config = require('config');
const jwt = require('jsonwebtoken');
const customerService = require('../services/customers');
const helpers = require('../helpers');


module.exports = isSuper => (req, res, next) => {
  req.checkHeaders({
    'x-access-id': {
      optional: true,
      isNumber: true
    },
    'x-access-token': {
      optional: true,
      isString: true
    },
    'x-access-prefix': {
      optional: true,
      isString: true,
      isValidPrefix: true
    }
  });


  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: 'VALIDATION_ERROR', result: errors });
  }

  const adminId = +req.headers['x-access-id'];
  const token = req.headers['x-access-token'];
  const prefix = req.headers['x-access-prefix'];
  const jwtSecret = config.get(`jwt.${helpers.getConfigKey(prefix)}.secret`);

  jwt.verify(token, jwtSecret, (err, admin) => {
    if (err) {
      return res.status(403).json({ err: true, err_msg: 'INVALID_TOKEN' });
    }
    if (admin) {
      if (admin.administratorId !== adminId) {
        return res.status(403).json({ err: true, err_msg: 'TOKEN_ID_MISMATCH' });
      }
      const customerId = admin.customerId;

      if (isSuper && (prefix !== 'zz' || customerId !== 1)) {
        return res.status(403).json({ err: true, err_msg: 'SERVICE_NOT_ALLOWED' });
      }


      if (admin.customer.prefix !== prefix) {
        return req.status(403).json({ err: true, err_msg: 'PREFIX_MISMATCH' });
      }
      if (!customerService.get.customerId(customerId)) {
        return res.status(403).json({ err: true, err_msg: 'INVALID_CUSTOMER' });
      }

      if (isSuper) {
        req.network = {};
        if (admin.network) {
          req.network = admin.network;
        }
      }
      req.admin = admin;
      req.adminId = admin.administratorId;
      req.customerId = customerId;
      return next();
    }
    return res.status(403).json({ err: true, err_msg: 'INVALID_ADMIN' });
  });
};
