const express = require('express');
const config = require('config');
const helpers = require('../../../helpers');

const router = express.Router();


/*
 * URL: /v2/billing/methods
 * METHOD: GET
 * Description: Get Customer payment methods
 */
router.get('/', (req, res) => {
  const prefix = req.administrator.customer.prefix;

  const methods = config.has(`payments.${helpers.getConfigKey(prefix)}.methods`)
    ? config.get(`payments.${helpers.getConfigKey(prefix)}.methods`)
    : [];

  return res.json({ err: false, result: methods }).send();
});

module.exports = router;
