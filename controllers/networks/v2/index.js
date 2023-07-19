const express = require('express');
const networkAccessService = require('../../../middlewares/networkAccessControl');

const router = express.Router();


router.use('/gateways', networkAccessService, require('./gateways'));


module.exports = router;
