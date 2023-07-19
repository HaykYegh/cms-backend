const express = require('express');
const adminService = require('../../services/admin');
const logger = require('../../services/logger');


const router = express.Router();


/**
 * URL: /v2/admins/:adminId/password
 * METHOD: POST
 * Description: Create or replace password
 */

router.post('/:adminId/password', (req, res, next) => {
  if (req.administrator.isSuper) {
    next();
  } else {
    return res.json({ err: true, err_msg: 'NOT_AUTHORIZED' });
  }
}, async (req, res) => {
  req.checkParams({
    adminId: {
      notEmpty: true,
      isNumber: true
    }
  });
  req.assert('password', 'Password must be at least 4 characters long.').len(4);
  req.assert('confirmPassword', 'Passwords must match.').equals(req.body.password);

  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: 'VALIDATION_ERROR', result: errors });
  }
  const customerId = req.customerId;
  const { adminId } = req.params;
  const { password } = req.body;

  try {
    const params = { customerId, adminId, password };

    const result = await adminService.profile.updatePassword(null, params);

    res.json({ err: false, result });
  } catch (e) {
    logger.error(e);
    res.json({ err: true, err_msg: e.message });
  }
});

/**
 * URL: /v2/admins/:adminId
 * METHOD: DELETE
 * Description: Delete admin
 */

router.delete('/:adminId', (req, res, next) => {
  if (req.administrator.isSuper) {
    next();
  } else {
    return res.json({ err: true, err_msg: 'NOT_AUTHORIZED' });
  }
}, async (req, res) => {
  req.checkParams({
    adminId: {
      notEmpty: true,
      isNumber: true
    }
  });
  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: 'VALIDATION_ERROR', result: errors });
  }
  const customerId = req.customerId;
  const { adminId } = req.params;
  try {
    const result = adminService.delete.admin(null, { customerId, adminId });
    res.json({ err: false, result });
  } catch (e) {
    logger.error(e);
    res.json({ err: true, err_msg: e.message });
  }
});


module.exports = router;
