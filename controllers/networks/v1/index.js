const express = require('express');
const networkAccessService = require('../../../middlewares/networkAccessControl');

const router = express.Router();


router.use('/authentication', require('./authentication'));
router.use('/networks', networkAccessService, require('./networks'));
router.use('/gateways', networkAccessService, require('./gateways'));
router.use('/call-history', networkAccessService, require('./call-history'));
router.use('/system-messages', networkAccessService, require('./system-messages'));
router.use('/users', networkAccessService, require('./users'));
router.use('/payments', networkAccessService, require('./payments'));
router.use('/stats', networkAccessService, require('./stats'));
router.use('/settings', networkAccessService, require('./settings'));
router.use('/notifications', networkAccessService, require('./notifications'));
router.use('/services', networkAccessService, require('./services'));


module.exports = router;
