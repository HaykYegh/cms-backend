const express = require('express');
const statsService = require('../../../services/stats');
const logger = require('../../../services/logger');
const userService = require('../../../services/user');

const router = express.Router();


router.use('/messages', require('./messages'));
router.use('/calls', require('./calls'));
router.use('/users', require('./users'));


/**
 * URL: /v2/stats
 * METHOD: GET
 * Description: Get real time stats
 */

router.get('/', async (req, res) => {
  const customerId = req.customerId;
  try {
    const getLiveStats = statsService.getLiveStats({ customerId });
    const getTotalUsersCount = userService.getTotalUsersCount({ customerId });

    const [liveStats, totalUsersCount] = await Promise.all([
      getLiveStats,
      getTotalUsersCount
    ]);

    const result = { ...liveStats, totalUsersCount };

    res.json({ err: false, result });
  } catch (e) {
    logger.error(e);
    res.json({ err: true, err_msg: e.message });
  }
});


module.exports = router;
