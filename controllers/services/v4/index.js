const express = require('express');
const clientAccessControl = require('../../../middlewares/client-access-control');


const router = express.Router();


router.use('/networks', clientAccessControl, require('./networks'));
router.use('/call-rates', clientAccessControl, require('./call-rates'));
router.use('/customers', require('./customers'));
router.use('/images', require('./images'));


router.get('/', (req, res) => {
  res.json({ title: 'v4' });
});


module.exports = router;
