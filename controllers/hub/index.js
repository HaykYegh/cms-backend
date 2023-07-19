const express = require('express');
const clientAccess = require('../../middlewares/client');
const clientAccessControl = require('../../middlewares/client-access-control');

const router = express.Router();


router.use('/vn', require('./vn'));
router.use('/call', clientAccess, require('./call'));
router.use('/call-rates', clientAccessControl, require('./call-rates'));
router.use('/stickers', clientAccessControl, require('./stickers'));


module.exports = router;
