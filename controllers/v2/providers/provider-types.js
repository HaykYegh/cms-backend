const express = require('express');
const logger = require('../../../services/logger');
const providerService = require('../../../services/third-party-providers');

const router = express.Router();


/**
 * URL: /v2/providers/provider-types
 * METHOD: GET
 * Description: Get third party providers types
 */

router.get('/provider-types', async (req, res) => {
  req.checkQuery({
    offset: {
      notEmpty: true,
      isNumber: true
    },
    limit: {
      notEmpty: true,
      isNumber: true
    }
  });

  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: 'VALIDATION_ERROR', result: errors });
  }

  const limit = +req.query.limit;
  const offset = +req.query.offset * limit;

  try {
    const result = await providerService.list.providerTypes(null, { limit, offset });
    res.json({ err: false, result });
  } catch (e) {
    logger.error(e);
    res.json({ err: true, err_msg: e.message });
  }
});
/**
 * URL: /v2/providers/provider-types/count
 * METHOD: GET
 * Description: Get third party provider types count
 */

router.get('/provider-types/count', async (req, res) => {
  try {
    const result = await providerService.count.providerTypes();
    res.json({ err: false, result });
  } catch (e) {
    logger.error(e);
    res.json({ err: true, err_msg: e.message });
  }
});


module.exports = router;
