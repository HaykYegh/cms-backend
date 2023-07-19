const express = require('express');
const logger = require('../../../services/logger');
const adminService = require('../../../services/admin');

const router = express.Router();


/**
 * URL: /networks/v1/settings/profile
 * METHOD: GET
 * Description: GET admin attributes
 */

router.get('/profile', async (req, res) => {
  const { customerId, adminId, networkId } = req;
  try {
    const result = await adminService
      .profile
      .getAttributes(null, { customerId, networkId, adminId });
    res.json({ error: false, result });
  } catch (e) {
    logger.error(e);
    res.json({ error: true, errorMessage: e.message });
  }
});

/**
 * URL: /networks/v1/settings/profile
 * METHOD: POST
 * Description: Create or replace user attributes
 */

router.post('/profile', async (req, res) => {
  req.checkBody({
    attributes: {
      notEmpty: true,
      isArray: true
    }
  });
  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: 'VALIDATION_ERROR', result: errors });
  }

  const { attributes } = req.body;
  const { adminId } = req;
  try {
    const result = await adminService
      .profile
      .upsertAttributes(null, { adminId, attributes });
    res.json({ error: false, result });
  } catch (e) {
    logger.error(e);
    res.json({ error: true, errorMessage: e.message });
  }
});


/**
 * URL: /networks/v1/settings/password
 * METHOD: POST
 * Description: Update password
 */

router.post('/password', async (req, res) => {
  req.checkBody({
    password: {
      notEmpty: true,
      isString: true,
    },
    currentPassword: {
      notEmpty: true,
      isString: true,
    }
  });
  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: 'VALIDATION_ERROR', result: errors });
  }

  const { password, currentPassword } = req.body;
  const { adminId, networkId, customerId } = req;
  try {
    const result = await adminService
      .profile
      .updatePassword(null, { customerId, networkId, adminId, password, currentPassword });
    res.json({ error: false, result });
  } catch (e) {
    logger.error(e);
    res.json({ error: true, errorMessage: e.message });
  }
});


module.exports = router;
