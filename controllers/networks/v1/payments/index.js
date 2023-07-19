const express = require('express');
const config = require('config');

const router = express.Router();


router.use('/cards', require('./cards'));
router.use('/customers', require('./customers'));
router.use('/invoices', require('./invoices'));
router.use('/subscriptions', require('./subscriptions'));


router.get('/', (req, res) => {
  const configuration = {
    version: '0.0.1',
    publicKey: config.get('stripe.publicKey')
  };

  res.json({ err: false, result: configuration }).send();
});


module.exports = router;

