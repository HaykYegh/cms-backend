const express = require('express');

const router = express.Router();


router.use('/countries', require('./countries'));

module.exports = router;
