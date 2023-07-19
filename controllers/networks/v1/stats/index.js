const express = require('express');
const logger = require('../../../../services/logger');
const statsService = require('../../../../services/stats');
const userService = require('../../../../services/user');

const router = express.Router();

router.use('/messages', require('./messages'));
router.use('/calls', require('./calls'));

/**
 * URL: /networks/v2/stats
 * METHOD: GET
 * Description: Get real time stats
 */

router.get('/', async (req, res) => {
  const customerId = req.customerId;
  const networkId = req.networkId;

  try {
    const getLiveStats = statsService.getLiveStats({ customerId, networkId });
    const getTotalUsersCount = userService.getTotalUsersCount({ customerId, networkId });

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
