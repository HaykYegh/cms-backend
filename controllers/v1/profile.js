const express = require('express');

const router = express.Router();


/**
 * URL: /v1/profile
 * METHOD: GET
 * Description: GET admin profile information by id
 */

router.get('/', (req, res) => {
  global.sql.run('profile', [req.administratorId], (err, attributes) => {
    if (err) {
      global.log.error(err);
      const error = {
        err: true,
        err_msg: 'unable select attributes',
      };
      return res.status(500).json(error).send();
    }
    return res.status(200).json({ err: false, result: attributes }).send();
  });
});


/**
 * URL: /v1/profile/password
 * METHOD: PUT
 * Description: PUT update administrator password
 */


router.put('/password', (req, res) => {
  req.assert('password', 'Password must be at least 4 characters long.').len(4).notEmpty();
  req.assert('confirmPassword', 'Passwords must match.').equals(req.body.password);
  req.assert('currentPassword', 'Password must be at least 4 characters long.').len(4).notEmpty();

  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: errors }).send();
  }

  const body = req.body;
  const administratorId = parseInt(req.administratorId, 10);
  const password = body.password;
  const currentPassword = body.currentPassword;

  global.sql.first('profile-update-password', [administratorId, password, currentPassword], (err, result) => {
    if (err) {
      global.log.error(err);
      const error = {
        err: true,
        err_msg: 'unable update administrator password',
      };
      return res.status(500).json(error).send();
    }
    if (result.action) {
      return res.status(200).json({ err: false, result: true }).send();
    }
    return res.status(200).json({ err: true, err_msg: 'unknown error' }).send();
  });
});


/*
 * URL: /v1/profile
 * METHOD: PUT
 * Description: PUT update profile by id
 */

router.put('/', (req, res) => {
  req.checkBody({
    attribute_id: {
      notEmpty: true,
    },
    value: {
      notEmpty: true,
    }
  });

  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: errors }).send();
  }

  const body = req.body;
  const administratorId = parseInt(req.administratorId, 10);
  const attributeId = parseInt(body.attribute_id, 10);
  const value = body.value;

  global.sql.run('profile-update', [administratorId, attributeId, value], (err, result, query) => {
    if (err) {
      global.log.error(err);
      const error = {
        err: true,
        err_msg: 'unable update administrator',
      };
      return res.status(500).json(error).send();
    }
    if (query.rowCount === 1) {
      return res.status(200).json({ err: false, result: true }).send();
    }
    return res.status(200).json({ err: true, err_msg: 'unknown error' }).send();
  });
});


module.exports = router;
