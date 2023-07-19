const express = require('express');

const router = express.Router();


router.use('/rates', require('./rates'));


module.exports = router;
