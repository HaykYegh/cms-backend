const express = require('express');

const accessService = require('../../middlewares/user');

const router = express.Router();


router.use('/authentication', accessService.authMiddleware, require('./authentication'));
router.use('/stickers', accessService, require('./stickers'));
router.use('/notifications', accessService, require('./notifications'));
router.use('/templates', accessService, require('./templates'));
router.use('/profile', accessService, require('./profile'));
router.use('/misc', accessService, require('./misc'));
router.use('/statistics', accessService, require('./statistics'));
router.use('/gateways', accessService, require('./gateways'));
router.use('/customers', accessService, require('./customers'));
router.use('/activities', accessService, require('./activities'));


router.use('/users', accessService, require('./users'));
router.use('/devices', accessService, require('./devices'));
router.use('/attempts', accessService, require('./attempts'));
router.use('/administrators', accessService, require('./administrators'));
router.use('/networks', accessService, require('./networks'));
router.use('/channels', accessService, require('./channels'));


router.get('/', (req, res) => {
  res.json({ title: 'v1' }).send();
});


module.exports = router;
