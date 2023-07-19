const express = require('express');

const router = express.Router();

router.use('/public', require('./public'));
router.use('/v1', require('./v1'));

module.exports = router;
