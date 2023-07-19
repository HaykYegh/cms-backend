const express = require('express');

const accessService = global.__import('middlewares/user');

const router = express.Router();


router.use('/user-groups', accessService, require('./user-groups'));
router.use('/gateways', accessService, require('./gateways'));
router.use('/calls', accessService, require('./calls'));
router.use('/providers', accessService, require('./providers'));
router.use('/app-releases', accessService, require('./app-releases'));
router.use('/billing', accessService, require('./billing'));


router.get('/', (req, res) => {
  res.json({ title: 'v3' }).send();
});

module.exports = router;

