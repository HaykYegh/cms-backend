const express = require('express');

const router = express.Router();

router.use('/users', require('./users'));
router.use('/live', require('./live'));

module.exports = router;
