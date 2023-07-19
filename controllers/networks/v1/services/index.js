const express = require('express');
const logger = require('../../../../services/logger');
const { list, count } = require('../../../../services/network/services');

const router = express.Router();


/**
 * URL: /networks/v1/services/invites
 * NAME: Invite middleware
 */

router.use('/', require('./invites'));
router.use('/', require('./users'));


/**
 * URL: /networks/v1/services
 * METHOD: GET
 * Description: Get network services
 */

router.get('/', async (req, res) => {
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
  const customerId = req.customerId;
  const networkId = req.networkId;
  const limit = +req.query.limit;
  const offset = +req.query.offset * limit;

  try {
    const result = await list
      .services(null, { customerId, networkId, limit, offset });
    res.json({ err: false, result });
  } catch (e) {
    logger.error(e);
    res.json({ err: true, err_msg: e.message });
  }
});


/**
 * URL: /networks/v1/services/count
 * METHOD: GET
 * Description: Get network services  count
 */

router.get('/count', async (req, res) => {
  const customerId = req.customerId;
  const networkId = req.networkId;

  try {
    const result = await count
      .services(null, { customerId, networkId });
    res.json({ err: false, result });
  } catch (e) {
    logger.error(e);
    res.json({ err: true, err_msg: e.message });
  }
});


module.exports = router;
