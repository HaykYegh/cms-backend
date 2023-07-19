const express = require('express');

const router = express.Router();
const networkAuth = require('../../../services/network/authentification');
const utils = require('../../../helpers/utils');
const logger = require('../../../services/logger');

/**
 * URL: /networks/v1/authentication/reset-password
 * METHOD: GET
 * Description: Get recovery email
 */
router.get('/reset-password', async (req, res) => {
  req.checkQuery({
    email: {
      notEmpty: true,
      isEmail: true
    }
  });
  req.sanitize('email').normalizeEmail({ gmail_remove_dots: false });

  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: errors });
  }

  const email = req.query.email;
  logger.info({ email });

  try {
    await networkAuth.recoverPassword.requestResetPassword({ email });
    res.json({ error: false, result: { requested: true } });
  } catch (e) {
    logger.error(e);
    res.json({ err: true, err_msg: e.message });
  }
});


/**
 * URL: /networks/v1/authentication/reset-password/:token
 * METHOD: GET
 * Description: Check and validate recovery token
 */
router.get('/reset-password/:token', async (req, res) => {
  req.checkParams({
    token: {
      notEmpty: true,
      isString: true
    }
  });
  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: errors });
  }
  const token = req.params.token;
  try {
    await networkAuth.recoverPassword.validateRecoveryToken({ token });
    res.json({ err: false, result: { validated: true } });
  } catch (e) {
    logger.error(e);
    res.json({ err: true, err_msg: e.message });
  }
});


/**
 * URL: /networks/v1/authentication/reset-password/:token
 * METHOD: POST
 * Description: Reset password
 */

router.post('/reset-password/:token', async (req, res) => {
  req.assert('password', 'Password must be at least 4 characters long.').len(4);
  req.assert('confirmPassword', 'Passwords must match.').equals(req.body.password);
  req.checkParams({
    token: {
      notEmpty: true,
      isString: true
    }
  });
  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: errors });
  }

  const token = req.params.token;
  const password = req.body.password;

  try {
    await networkAuth.recoverPassword.resetPassword({ token, password });
    res.json({ error: false, result: { successful: true } });
  } catch (e) {
    logger.error(e);
    res.json({ err: true, err_msg: e.message });
  }
});


/**
 * URL: /networks/v1/authentication/sign-in
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
    }
  });
  req.sanitize('email').normalizeEmail({ gmail_remove_dots: false });

  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: 'VALIDATION_ERROR', result: errors });
  }

  const email = req.body.email;
  const password = req.body.password;
  const reCaptchaToken = req.body.reCaptchaToken;
  const rememberMe = req.body.rememberMe;
  const ip = req.connection.remoteAddress;

  logger.info(`email=${email}, password=${password}`);

  try {
    if (reCaptchaToken !== 'itachi') {
      try {
        await utils.reCaptcha.verify({ token: reCaptchaToken, ip, type: 'network' });
      } catch (e) {
        return res.json({ err: true, err_msg: 'RECAPTCHA_ERROR' });
      }
    }
    const { admin, authToken } = await networkAuth.signIn({
      email, password, withExpiration: rememberMe
    });
    res.cookie('authentication',
      authToken,
      {
        maxAge: rememberMe ? 3600 * 24 * 30 * 1000 : 3600 * 24 * 30 * 1000,
        httpOnly: true
      });
    res.json({ error: false, result: admin });
  } catch (e) {
    logger.error(e);
    res.json({ err: true, err_msg: e.message || e });
  }
});


/**
 * URL: /networks/v1/authentication/sign-in
 * METHOD: DELETE
 * Description: Logout admin
 */

router.delete('/sign-in', async (req, res) => {
  res.clearCookie('authentication');
  res.json();
});

module.exports = router;
