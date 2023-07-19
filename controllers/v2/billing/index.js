const express = require('express');

const router = express.Router();

router.use('/transactions', require('./transactions'));
router.use('/channelTransactions', require('./channelTransactions'));
router.use('/methods', require('./methods'));
router.use('/transfers', require('./transfers'));
router.use('/charges', require('./charges'));
router.use('/balance', require('./balance'));
router.use('/call-history', require('./call-history'));
router.use('/statistics', require('./statistics'));

module.exports = router;
