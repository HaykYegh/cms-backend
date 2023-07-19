const config = require('config');
const redis = require('redis').createClient(config.get('redis'));

const { getCustomers } = require('../services/customers');


module.exports = (req, res, next) => {
  req.checkHeaders({
    'x-access-number': {
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
    return res.json({ error: true, errorMessage: 'VALIDATION_ERROR', result: errors });
  }
  const prefix = req.headers['x-access-prefix'];
  const username = `${prefix}${req.headers['x-access-number']}`;
  const token = req.headers['x-access-token'];
  const hashName = `${username}_push`;


  console.log(hashName);
  console.log(token);


  redis.hexists(hashName, token, ((err, reply) => {
    if (err) {
      return res.status(200).json({ error: true, errorMessage: 'REDIS_HEXIST_ERROR', result: err }).send();
    }
    if (!reply) {
      return res.status(403).json({ error: true, errorMessage: 'EMPTY_CREDENTIALS' }).send();
    }
    redis.hget(hashName, token, ((err, reply) => {
      if (err) {
        return res.status(200).json({ error: true, errorMessage: 'REDIS_HGET_ERROR', result: err }).send();
      }
      if (!reply) {
        return res.status(403).json({ error: true, errorMessage: 'INVALID_CREDENTIALS' }).send();
      }
      const customer = getCustomers().getValue(prefix);

      req.user = {
        prefix: customer.prefix,
        customerId: customer.customerId,
        ...JSON.parse(reply),
      };
      if (!req.user.username) {
        req.user.username = username;
      }

      next();
    }));
  }));
};
