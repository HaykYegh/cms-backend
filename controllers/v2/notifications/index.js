const express = require('express');

const router = express.Router();


/**
 * URL: /v2/notifications/senders
 * NAME: Sender middleware
 */

router.use('/senders', require('./senders'));


/**
 * URL: /v2/notifications/user-groups
 * NAME: User group middleware which allows to send notification to all members of selected group
 */

router.use('/user-groups', require('./user-groups'));


module.exports = router;
