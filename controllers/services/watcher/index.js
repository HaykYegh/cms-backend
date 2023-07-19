const express = require('express');
const networkService = require('../../../services/network');
const logger = require('../../../services/logger');

const router = express.Router();


/**
 * URL: /watcher/trial/end
 * METHOD: POST
 * Description: End trial period
 */

router.post('/trial/end', async (req, res) => {
  req.checkBody({
    networkId: {
      notEmpty: true,
      isNumber: true
    }
  });
  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: 'VALIDATION_ERROR', result: errors });
  }
  const customerId = req.customerId;
  const networkId = req.body.networkId;
  try {
    const result = await networkService.endTrial(null, { customerId, networkId });
    res.json({ err: false, result: { ...result.trial } });
  } catch (e) {
    logger.error(e);
    res.json({ err: true, err_msg: e.message });
  }
});

module.exports = router;
