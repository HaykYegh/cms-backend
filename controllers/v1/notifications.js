const express = require('express');
const fs = require('fs');
const _chunk = require('lodash/chunk');
const request = require('request');
const config = require('config');
const systemMessageService = require('../../services/system-message');
const customerService = require('../../services/customers');
const logger = require('../../services/logger');
const userService = require('../../services/user');

const router = express.Router();

/**
 * URL: /v1/notifications/users/count
 * METHOD: GET
 * Description: GET notification users count
 */

router.get('/users/count', async (req, res) => {
    req.checkQuery({
        platforms: {
            notEmpty: true,
            isString: true
        },
        countries: {
            notEmpty: true,
            isString: true
        },
        startsWith: {
            optional: true,
            isString: true
        },
        startsWithNickname: {
            optional: true,
            isString: true
        }
    });
    const errors = req.validationErrors(true);
    if (errors) {
        return res.json({err: true, err_msg: 'VALIDATION_ERROR', result: errors});
    }

    const {platforms, countries, startsWithNickname} = req.query;
    const customerId = req.customerId;
    const prefix = req.administrator.customer.prefix;
    const startsWith = prefix + (req.query.startsWith || '');

    logger.info(`platforms=${platforms}, countries=${countries},customerId=${customerId}, startsWith=${startsWith}`);
    try {
        const count = await systemMessageService
            .users
            .getUsersCount({customerId, platforms, countries, startsWith, startsWithNickname});
        res.json({err: false, result: {count}});
    } catch (e) {
        logger.error(e);
        res.json({err: true, err_msg: 'DB_ERROR'});
    }
});


/* URL: /v1/notifications/users/numbers
* METHOD: GET
* Description: Send notifications to specific network users
*/

router.post('/users/numbers', async (req, res) => {
    req.checkBody({
        numbers: {
            isArray: true
        },
        emails: {
            isArray: true
        },
        message: {
            notEmpty: true,
            isString: true
        },
        senderId: {
            optional: true
        }
    });
    const errors = req.validationErrors(true);
    if (errors) {
        return res.json({err: true, err_msg: 'VALIDATION_ERROR', result: errors});
    }
    const {senderId = null, numbers, emails, message} = req.body;
    const customerId = req.customerId;
    const prefix = req.admin.customer.prefix;
    const usernameList = numbers.map(number => prefix + number);
    logger.info(`prefix=${prefix}, usernameList=${usernameList}, emailList=${emails}`);

    try {
        const validatedUsers = await userService
            .network
            .get
            .users(null, {customerId, usernameList});
        const validateEmailUsers = await userService
            .network
            .get
            .usersByEmail(null, {customerId, emails});
        console.log("Notifications_validatedUsers", validatedUsers);
        const fullValidatedUsersList = validatedUsers.concat(validateEmailUsers);
        if (fullValidatedUsersList.length === 0) {
            return res.json({err: true, err_msg: 'EMPTY_USERS'});
        }

        logger.info(`fullValidatedUsersList`, fullValidatedUsersList);

        const fullUsersList = fullValidatedUsersList.map(user => user.username);
        logger.info(`fullUsersList`, fullUsersList);
        const usersChunk = _chunk(fullUsersList, 1500);

        let sender = null;

        if (senderId) {
            sender = await systemMessageService
                .senders
                .retrieve
                .sender(null, {customerId, senderId});
        }
        const senderRequests = usersChunk
            .map((users) => {
                console.log(users, 'users');
                if (sender) {
                    let image = null;
                    if (sender.image) {
                        image = sender.image;
                        image.id = sender.image.messageSenderImageId;
                    }

                    const senderModel = {
                        label: sender.label,
                        number: sender.number,
                        isVerified: sender.isVerified,
                        image
                    };

                    return systemMessageService.toServer.sendViaSender(senderModel, message, users);
                }
                const {number} = customerService.get.customerId(customerId);
                return systemMessageService.bulkSend(number, message, users);
            });
        try {
            const senderResult = await Promise.all(senderRequests);
            logger.info(senderResult);
            res.json({err: false, result: {affectedUsers: fullValidatedUsersList}});
        } catch (e) {
            console.log(e);

            logger.error(e);
            res.json({err: true, err_msg: 'SERVER_ERROR'});
        }
    } catch (e) {
        logger.error(e);
        res.json({err: true, err_msg: 'VALIDATE_USERS_ERROR'});
    }
});


/**
 * URL: /v1/notifications/users
 * METHOD: POST
 * Description: System message batch sender
 */

router.post('/users', async (req, res) => {
    req.checkQuery({
        platforms: {
            notEmpty: true,
            isString: true
        },
        countries: {
            notEmpty: true,
            isString: true
        },
        startsWith: {
            optional: true,
            isString: true
        },
        startsWidthNickname: {
            optional: true,
            isString: true
        },
        senderId: {
            optional: true,
            isNumber: true
        }
    });
    const errors = req.validationErrors(true);
    if (errors) {
        return res.json({err: true, err_msg: 'VALIDATION_ERROR', result: errors});
    }

    const {platforms, countries} = req.query;
    const {message, senderId = null} = req.body;
    const customerId = req.customerId;
    const prefix = req.administrator.customer.prefix;
    const startsWith = prefix + (req.query.startsWith || '');
    const startsWidthNickname = req.query.startsWidthNickname || null;

    const delimiter = 1500;

    try {
        const validatedUsers = await systemMessageService
            .users
            .getUsers({customerId, platforms, countries, startsWith, startsWidthNickname});
        console.log(startsWidthNickname, 'startsWidthNickname');
        if (!validatedUsers.length) {
            return res.json({err: true, err_msg: 'EMPTY_USERS'});
        }
        const users = validatedUsers.map(user => user.username);
        const usersChunk = _chunk(users, delimiter);
        let sender = null;

        if (senderId) {
            sender = await systemMessageService
                .senders
                .retrieve
                .sender(null, {customerId, senderId});
        }
        const senderRequests = usersChunk
            .map((users) => {
                if (sender) {
                    let image = null;
                    if (sender.image) {
                        image = sender.image;
                        image.id = sender.image.messageSenderImageId;
                    }

                    const senderModel = {
                        label: sender.label,
                        number: sender.number,
                        isVerified: sender.isVerified,
                        image
                    };

                    return systemMessageService.toServer.sendViaSender(senderModel, message, users);
                }
                const {number} = customerService.get.customerId(customerId);
                return systemMessageService.bulkSend(number, message, users);
            });
        const senderResult = await Promise.all(senderRequests);
        logger.info(senderResult);

        res.json({err: false, result: {affectedChunks: senderRequests.length}});
    } catch (e) {
        logger.error(e);
        res.json({err: true, err_msg: 'DB_ERROR'});
    }
});


/**
 * URL: /v1/notifications
 * METHOD: GET
 * Description: GET notification users
 */

router.get('/', (req, res) => {
    req.checkQuery({
        platforms: {
            optional: false,
            notEmpty: true
        },
        countries: {
            optional: false,
            notEmpty: true

        }
    });
    const errors = req.validationErrors(true);
    if (errors) {
        return res.json({err: true, err_msg: errors}).send();
    }
    const countries = req.query.countries;
    const platforms = req.query.platforms;
    const customerId = req.customerId;
    const sqlQueryBuffer = fs.readFileSync(`${global.__base}/sql/notification/get-notification-users.sql`);

    const sql = sqlQueryBuffer
        .toString()
        .replace('{countries}', countries)
        .replace('{platforms}', platforms)
        .replace('{customer_id}', customerId);

    const promise = global.query(sql);

    function success(rows, result) {
        return res.status(200).json({err: false, result: {count: result.rowCount}}).send();
    }

    function error(err) {
        global.log.error(err);
        const error = {
            err: true,
            err_msg: 'unable select users',
        };
        return res.status(200).json(error).send();
    }

    promise.spread(success, error);
});


/**
 * URL: /v1/notifications
 * METHOD: PUT
 * Description: Send notification to selected users
 */

router.put('/', (req, res) => {
    req.checkQuery({
        platforms: {
            optional: false,
        },
        countries: {
            optional: false,
        }
    });
    req.checkBody({
        message: {
            optional: false,
            notEmpty: true
        }
    });
    const errors = req.validationErrors(true);
    if (errors) {
        return res.json({err: false, err_msg: errors}).send();
    }

    const customerId = req.customerId;
    const countries = req.query.countries;
    const platforms = req.query.platforms;
    const sqlQueryBuffer = fs.readFileSync(`${global.__base}/sql/notification/get-notification-users.sql`);

    const sql = sqlQueryBuffer
        .toString()
        .replace('{countries}', countries)
        .replace('{platforms}', platforms)
        .replace('{customer_id}', customerId);
    const promise = global.query(sql);

    function success(rows) {
        const data = {
            from: req.administrator.customer.customerBusinessNumber,
            body: req.body.message,
            users: rows.map(user => user.username),
        };
        console.log('NOTIFICATION');
        console.log(data);

        request.post(`${config.get('openFire.host')}/plugins/zservlet/sendmsgbylist`, {
            json: data,
            headers: {
                'Content-Type': 'application/json'
            }
        }, (err, httpResponse, result) => {
            if (err || result.err) {
                global.log.error(err || result.err);
                return res.json({err: true, err_msg: err});
            }
            if (!result.err) {
                return res.status(200).json({err: false, result: success}).send();
            }

            return res.status(200).json({
                err: true,
                err_msg: 'UNKNOWN_ERROR',
            }).send();
        });
    }

    function error(err) {
        global.log.error(err);
        const error = {
            err: true,
            err_msg: 'unable select users',
        };
        return res.status(200).json(error).send();
    }

    promise.spread(success, error);
});

/**
 * URL: /v1/notifications/users
 * METHOD: PUT
 * Description: Send notification to selected users
 */

router.put('/users', (req, res) => {
    req.checkParams({
        users: {
            optional: false,
        }
    });
    req.checkBody({
        message: {
            optional: false,
            notEmpty: true
        },
        users: {
            isArray: true
        }
    });
    const errors = req.validationErrors(true);
    if (errors) {
        return res.json({err: false, err_msg: errors}).send();
    }
    const users = req.body.users;
    const data = {
        from: req.administrator.customer.customerBusinessNumber,
        body: req.body.message,
        users: users.map(user => req.administrator.customer.prefix + user),
    };
    console.log('NOTIFICATION');
    console.log(data);
    request.post(`${config.get('openFire.host')}/plugins/zservlet/sendmsgbylist`, {
        json: data,
        headers: {
            'Content-Type': 'application/json'
        }
    }, (err, httpResponse, result) => {
        if (err || !result || result.err) {
            console.log('error during sending notification request', err || result.err);
            return res.status(200).json({
                err: true,
                err_msg: err,
            }).send();
        }
        if (!result.err) {
            return res.status(200).json({err: false, result}).send();
        }
        return res.status(200).json({
            err: true,
            err_msg: 'UNKNOWN_ERROR',
        }).send();
    });
});

module.exports = router;
