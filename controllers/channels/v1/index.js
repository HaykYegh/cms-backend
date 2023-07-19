const express = require('express');
const channelAccessService = require('../../../middlewares/channel-access-control');

const router = express.Router();


router.use('/authentication', require('./authentication'));
router.use('/channels', channelAccessService, require('./channels'));
router.use('/transactions', channelAccessService, require('./transactions'));
router.use('/settings', channelAccessService, require('./settings'));
router.use('/users', channelAccessService, require('./users'));
router.use('/notifications', channelAccessService, require('./notifications'));
router.use('/system-messages', channelAccessService, require('./system-messages'));


module.exports = router;
