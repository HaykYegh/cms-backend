const express = require('express');
const watcherAccessToken = require('../../middlewares/watcherAccessControl');

const router = express.Router();

router.use('/v4', require('./v4'));
router.use('/watcher', watcherAccessToken, require('./watcher'));
router.use('/stripe-watcher', require('./watcher/stripe'));


router.get('/', (req, res) => {
  res.json({ reply: 'pong' });
});


module.exports = router;
