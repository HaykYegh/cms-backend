module.exports = (req, res, next) => {
  req.customerId = req.headers.customerId || 1;
  next();
};
