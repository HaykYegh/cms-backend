const config = require('config');
const express = require('express');
const jwt = require('jsonwebtoken');

const router = express.Router();
const emailService = require('../../services/email');
const sqlDB = require('../../services/db');
const utils = require('../../helpers/utils');
const helpers = require('../../helpers');
const logger = require('../../services/logger');
const constants = require('../../helpers/constants');


/**
 * URL: /v1/authentication/request-reset-password
 * METHOD: POST
 * Description: Request reset password
 */
router.post('/request-reset-password', async (req, res) => {
  req.checkBody({
    accessType: {
      optional: true,
      isString: true
    }
  });
  req.assert('email', 'Email is not valid').isEmail();
  req.sanitize('email').normalizeEmail({ gmail_remove_dots: false });
  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: errors });
  }

  const email = req.body.email;
  const prefix = req.headers['x-access-prefix'];
  const accessType = req.body.accessType;
  const configKey = accessType === 'business' ? constants.ZANGI_BUSINESS.CONFIG_KEY : helpers.getConfigKey(prefix);
  logger.info(`prefix => ${prefix}, email => ${email}`);

  try {
    const sqlResult = await sqlDB.query('sql/authentication/request-reset-password.sql', [prefix, email]);
    const result = sqlResult.rows[0];
    if (result) {
      const link = `${config.get(`app.baseUrl.client.${configKey}`)}/reset-password/${result.recoveryToken}`;
      emailService.requestResetPassword({ configKey, prefix })(result.email, link,
        (err) => {
          if (err) {
            global.log.error(err);
            return res.json({ err: true, err_msg: 'INVALID_SMTP_TRANSPORT' });
          }
          res.json({ error: false, result: { requested: true } });
        });
    } else {
      res.json({ err: true, err_msg: 'INVALID_ADMIN', result: {} }).send();
    }
  } catch (e) {
    global.log.error(e);
    res.json({ err: true, err_msg: 'DB_ERROR' });
  }
});


/**
 * URL: /v1/authentication/reset-password/:token
 * METHOD: GET
 * Description: Check recovery token
 */
router.get('/reset-password/:recoveryToken', async (req, res) => {
  req.checkParams({
    recoveryToken: {
      notEmpty: true,
    }
  });
  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: errors });
  }
  const recoveryToken = req.params.recoveryToken;
  const prefix = req.headers['x-access-prefix'];

  try {
    const sqlResult = await sqlDB.query('sql/authentication/get-recovery-token.sql', [prefix, recoveryToken]);
    const result = sqlResult.rows[0];
    if (result) {
      res.json({ err: false, result });
    } else {
      res.json({ err: true, err_msg: 'INVALID_RECOVERY_TOKEN' });
    }
  } catch (e) {
    global.log.error(e);
    res.json({ err: true, err_msg: 'DB_ERROR' });
  }
});


/**
 * URL: /v1/authentication/reset-password/:recoveryToken
 * METHOD: POST
 * Description: Reset password
 */

router.post('/reset-password/:recoveryToken', async (req, res) => {
  req.assert('password', 'Password must be at least 4 characters long.').len(4);
  req.assert('confirmPassword', 'Passwords must match.').equals(req.body.password);
  req.checkParams({
    recoveryToken: {
      notEmpty: true,
    }
  });

  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: errors });
  }

  const recoveryToken = req.params.recoveryToken;
  const password = req.body.password;
  const prefix = req.headers['x-access-prefix'];

  try {
    const sqlResult = await sqlDB.query('sql/authentication/reset-password.sql', [prefix, recoveryToken, password]);
    const result = sqlResult.rows[0];
    if (result) {
      res.json({ err: false, result });
    } else {
      res.json({ err: true, err_msg: 'INVALID_RECOVERY_TOKEN' });
    }
  } catch (e) {
    global.log.error(e);
    res.json({ err: true, err_msg: 'DB_ERROR' });
  }
});


/**
 * URL: /v1/authentication/sign-in
 * METHOD: POST
 * Description: Sign in administrator using email and password
 */

router.post('/sign-in', async (req, res) => {
  req.checkBody({
    email: {
      notEmpty: true,
      isEmail: true
    },
    password: {
      notEmpty: true
    },
    reCaptchaToken: {
      notEmpty: true
    },
    rememberMe: {
      isBoolean: true
    },
    accessType: {
      optional: true,
      isString: true
    }
  });
  req.sanitize('email').normalizeEmail({ gmail_remove_dots: false });

  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: errors });
  }

  const prefix = req.headers['x-access-prefix'];
  const email = req.body.email;
  const password = req.body.password;
  const reCaptchaToken = req.body.reCaptchaToken;
  const ip = req.connection.remoteAddress;
  const accessType = req.body.accessType;
  if (accessType !== 'business' && !prefix) {
    res.json({ err: true, err_msg: 'INVALID_PREFIX' });
  }
  const configKey = accessType === 'business' ? constants.ZANGI_BUSINESS.CONFIG_KEY : helpers.getConfigKey(prefix);

  try {
    const reCaptchaResult = await utils.validateReCaptcha({
      configKey,
      token: reCaptchaToken,
      ip,
    });
    if (reCaptchaResult.success) {
      const sqlResult = await sqlDB.query('sql/authentication/sign-in.sql', [
        prefix,
        email,
        password,
      ]);
      logger.info(sqlResult.rows);
      const result = sqlResult.rows[0];
      if (result) {
        const expireIn = req.body.rememberMe ? 30 * 24 * 60 * 60 * 1000 : 3600;
        jwt.sign(JSON.parse(JSON.stringify(result)), config.get(`jwt.${configKey}.secret`), {
          expiresIn: expireIn
        }, (err, token) => {
          if (err) {
            return res.json({ err: true, err_msg: 'INTERNAL_AUTHENTICATION_ERROR' });
          }
          res.header('X-Access-Id', result.administratorId);
          res.header('X-Access-Token', token);
          res.header('X-Access-Prefix', result.customer.prefix);
          res.json({ err: false, result });
        });
      } else {
        res.status(401).json({ err: true, err_msg: 'FORBIDDEN' });
      }
    } else {
      res.json({ err: true, err_msg: 'INVALID_RECAPTCHA_TOKEN' });
    }
  } catch (e) {
    res.status(401).json({ err: true, err_msg: 'FORBIDDEN' });
  }
});


module.exports = router;
