const express = require('express');
const emailService = require('../../../services/email');
const adminService = require('../../../services/admin');

const router = express.Router();
// router.use('/attempts', accessService, require('./attempts'));


/**
 * URL: /v1/administrators
 * METHOD: GET
 * Description: GET administrators
 */

router.get('/', (req, res) => {
  global.sql.run('administrators', [req.customerId], (err, users) => {
    if (err) {
      global.log.error(err);
      const error = {
        err: true,
        err_msg: 'unable select administrators',
      };
      return res.status(200).json(error).send();
    }

    return res.status(200).json({ err: false, result: users }).send();
  });
});

/**
 * URL: /v1/administrators/:administratorId
 * METHOD: GET
 * Description: GET specific admin
 */

router.get('/:administratorId', (req, res) => {
  req.checkParams({
    administratorId: {
      notEmpty: true,
    }
  });

  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: false, err_msg: errors }).send();
  }

  const administratorId = parseInt(req.params.administratorId, 10);

  global.sql.first('administrator', [req.customerId, administratorId], (err, user) => {
    if (err) {
      global.log.error(err);
      const error = {
        err: true,
        err_msg: 'unable select administrator',
      };
      return res.status(200).json(error).send();
    }

    return res.status(200).json({ err: false, result: user }).send();
  });
});


/**
 * URL: /v1/administrators
 * METHOD: POST
 * Description: Add administrator
 */

router.post('/', (req, res) => {
  req.assert('email', 'Email is not valid').isEmail();
  req.assert('password', 'Password must be at least 4 characters long.').len(4);
  req.assert('confirmPassword', 'Passwords must match.').equals(req.body.password);
  req.sanitize('email').normalizeEmail({ gmail_remove_dots: false });

  const errors = req.validationErrors();
  if (errors) {
    return res.json({ err: true, err_msg: errors });
  }

  const body = req.body;
  const email = body.email;
  const password = body.password;
  const readonly = body.readonlyAdmin;


  const prefix = req.administrator.customer.prefix;
  const customerName = req.administrator.customer.name;


  global.sql.first('signup', [email, password, req.customerId], async (err, callback) => {
    if (err) {
      global.log.error(err);
      return res.status(200).json({
        err: true,
        err_msg: err,
      }).send();
    }
    const administrator = callback.administrator;
    if (readonly) {
      await adminService
        .create
        .adminRole(null, {
          adminRole: 2,
          administratorId: administrator.administrator_id
        });
    }

    emailService.signUp({ prefix, customerName }, administrator.email, password, (err) => {
      if (err) {
        global.log.error(err);
      }
    });

    return res.status(200).json({ err: false, result: administrator }).send();
  });
});

module.exports = router;

