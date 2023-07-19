module.exports = (req, res, next) => {
  req.checkHeaders({
    resource: {
      isResourceToken: true,
    },
    prefix: {
      notEmpty: true,
      isValidPrefix: true,
    },
  });
  const errors = req.validationErrors(true);
  if (errors) {
    return res.status(200).json({ err: true, err_msg: errors }).send();
  }
  next();
};
