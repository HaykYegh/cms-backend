const express = require('express');
const logger = require('../../../services/logger');
const userGroupService = require('../../../services/user/groups');

const router = express.Router();


/**
 * URL: /v2/users/:userId/userGroups
 * METHOD: GET
 * Description: Get user group
 */

router.get('/:userId/userGroups', async (req, res) => {
  req.checkQuery({
    offset: {
      notEmpty: true,
      isNumber: true
    },
    limit: {
      optional: true,
      isNumber: true
    }
  });

  req.checkParams({
    userId: {
      notEmpty: true,
      isNumber: true
    }
  });

  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: 'VALIDATION_ERROR', result: errors });
  }

  const customerId = req.customerId;
  const userId = req.params.userId;

  const limit = +req.query.limit || 20;
  const offset = +req.query.offset * limit;


  try {
    const result = await userGroupService
      .list
      .userGroups(null, { customerId, userId, limit, offset });
    res.json({ err: false, result: { records: result } });
  } catch (e) {
    logger.error(e);
    res.json({ err: true, err_msg: e.message, result: e });
  }
});

module.exports = router;
