const express = require('express');
const logger = require('../../../services/logger');
const userService = require('../../../services/user');

const router = express.Router();

/**
 * URL: /v2/users/pre-users
 * METHOD: GET
 * Description: Get pre users
 */

router.get('/', async (req, res) => {
    req.checkQuery({
        limit: {
            optional: true,
            isNumber: true
        },
        offset: {
            notEmpty: true,
            isNumber: true
        }
    });

    const errors = req.validationErrors(true);
    if (errors) {
        return res.json({ err: true, err_msg: 'VALIDATION_ERROR', result: errors });
    }
    const customerId = req.customerId;
    console.log(customerId);
    const limit = parseInt(req.query.limit, 10) || 10;
    const offset = (req.query.offset) * limit;

    try {
        const result = await userService.preUsers.getAll.records({ customerId, limit, offset });
        res.json({ err: false, result: { records: result, count: 0 } });
    } catch (e) {
        logger.error(e);
        res.json({ err: true, err_msg: e.message });
    }
});


/**
 * URL: /v2/users/pre-users/count
 * METHOD: GET
 * Description: Get pre users count
 */

router.get('/count', async (req, res) => {
    const customerId = req.customerId;

    try {
        const result = await userService.preUsers.getAll.count({ customerId });
        res.json({ err: false, result });
    } catch (e) {
        logger.error(e);
        res.json({ err: true, err_msg: e.message });
    }
});

module.exports = router;
