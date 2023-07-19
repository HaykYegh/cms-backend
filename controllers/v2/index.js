const express = require('express');

const accessService = global.__import('middlewares/user');
const adminAccessMiddleware = require('../../middlewares/admin-access-control');

const router = express.Router();


router.use('/third-party-providers', accessService, require('./third-party-providers'));
router.use('/call-packages', accessService, require('./call-packages'));
router.use('/charging-cards', accessService, require('./charging-cards'));
router.use('/billing', accessService, require('./billing'));
router.use('/metrics', accessService, require('./metrics'));
router.use('/system-messages', accessService, require('./system-messages'));
router.use('/chat-bots', accessService, require('./chat-bots'));
router.use('/payments', accessService, require('./payments'));
router.use('/users', accessService, require('./users'));
router.use('/networks', accessService, require('./networks'));
router.use('/channels', accessService, require('./channels'));
router.use('/stats', accessService, require('./stats'));
router.use('/settings', accessService, require('./settings'));
router.use('/notifications', accessService, require('./notifications'));
router.use('/providers', accessService, require('./providers'));
router.use('/customers', adminAccessMiddleware(true), require('./customers'));
router.use('/admins', accessService, require('./admins'));
router.use('/search-channel', accessService, require('./search-channel'));


router.get('/', (req, res) => {
  res.json({ title: 'v2' }).send();
});

module.exports = router;
