module.exports = (req, res, next) => {
  req.checkHeaders({
    'X-Exchange-Token': {
      notEmpty: true,
      isString: true
    }
  });
  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ error: true, errorMessage: 'VALIDATION_ERROR', result: errors });
  }

  const exchangeToken = 'V3bhiqioXx4EA&@iY+tcKX^>Lhf*9?LFv7c4e2mqdM4PgJyuH6Q';
  const upcomingExchangeToken = req.headers['x-exchange-Token'];

  if (exchangeToken !== upcomingExchangeToken) {
    return res.json({ error: true, errorMessage: 'EXCHANGE_TOKEN_NOT_MATCH' });
  }


  req.customerId = 1;

  next();
};
