const express = require('express');
const router = express.Router();
const logger = require('../../../services/logger');
const adminService = require('../../../services/admin');

/**
 * URL: /channels/v1/settings/profile
 * METHOD: GET
 * Description: GET admin attributes
 */

router.get('/profile', async (req, res) => {
  const { customerId, adminId, channelId } = req;
  try {
    const result = await adminService
      .profile
      .channelGetAttributes(null, { customerId, channelId, adminId });
    res.json({ error: false, result });
  } catch (e) {
    logger.error(e);
    res.json({ error: true, errorMessage: e.message });
  }
});

module.exports = router;
