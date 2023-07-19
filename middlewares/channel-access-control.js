const config = require('config');
const jwt = require('jsonwebtoken');


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
      if (!admin.channel) {
        return res.status(401).json({ err: true, err_msg: 'INVALID_CHANNEL' });
      }
      req.admin = admin;
      req.customer = admin.customer;
      req.channel = admin.channel;
      req.adminId = admin.administratorId;
      req.customerId = admin.customer.customerId;
      req.channelId = admin.channel.roomName;
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

module.exports.checkChannel = (req, res, next) => {
  if (req.channel) {
    return res.json(403, { err: true, err_msg: 'FORBIDDEN' });
  }
  next();
};
