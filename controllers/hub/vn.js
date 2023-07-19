const express = require('express');

const router = express.Router();
const { INFO_TYPE } = require('../../helpers/constants');


/**
 * URL: /hub/vn/validate/:target
 * METHOD: GET
 * Description: GET Validate virtual network properties
 */

router.get('/validate/:target', (req, res) => {
  req.checkParams({
    target: {
      notEmpty: true,
    }
  });
  req.checkQuery({
    value: {
      notEmpty: true,
    },
  });
  req.checkHeaders({
    resource: {
      isResourceToken: true
    },
  });

  const errors = req.validationErrors(true);

  if (errors) {
    return res.status(200).json({ err: false, result: 'SERVER_ERROR' }).send();
  }

  const target = req.params.target;
  const value = req.query.value;

  switch (target) {
    case INFO_TYPE.HUB.VN.VALIDATE.EMAIL:
      global.sql.first('check-virtual-network-email', [value], (err, result) => {
        if (err) {
          global.log.error(err);
          return res.status(200).json({
            err: true,
            err_msg: err,
          }).send();
        }
        if (parseInt(result.count, 10) > 0) {
          return res.status(200).json({ err: false, result: 'EXIST' }).send();
        }
        return res.status(200).json({ err: false, result: true }).send();
      });
      break;
    case INFO_TYPE.HUB.VN.VALIDATE.VN_NAME:
      if (value.length <= 3) {
        return res.status(200).json({ err: false, result: 'SHORT' }).send();
      }
      global.sql.first('check-virtual-network-name', [value], (err, result) => {
        if (err) {
          global.log.error(err);
          return res.status(200).json({
            err: true,
            err_msg: err,
          }).send();
        }
        if (parseInt(result.count, 10) > 0) {
          return res.status(200).json({ err: false, result: 'EXIST' }).send();
        }
        return res.status(200).json({ err: false, result: true }).send();
      });
      break;
    default:
      return res.json({ err: true, err_msg: 'UNKNOWN_ERROR' }).send();
  }
});


/**
 * URL: /hub/vn/validate/:target
 * METHOD: GET
 * Description: GET Validate virtual network properties
 */

router.post('/', (req, res) => {
  req.assert('confirmPassword', 'Passwords must match.').equals(req.body.password);

  req.checkBody({
    email: {
      notEmpty: true,
      isEmail: true
    },
    password: {
      notEmpty: true
    },
    confirmPassword: {
      notEmpty: true
    },
    name: {
      notEmpty: true
    },
    firstName: {
      notEmpty: true
    },
    lastName: {
      notEmpty: true
    },
  });

  req.checkHeaders({
    resource: {
      isResourceToken: true
    },
  });

  const errors = req.validationErrors(true);

  if (errors) {
    return res.json({ err: true, err_msg: errors }).send();
  }

  const body = req.body;

  const email = body.email;
  const password = body.password;
  const name = body.name;
  const firstName = body.firstName;
  const lastName = body.lastName;

  global.sql.first('register-virtual-network', [email, password, firstName, lastName, name], (err, result) => {
    if (err) {
      global.log.error(err);
      return res.status(200).json({
        err: true,
        err_msg: err,
      }).send();
    }
    return res.status(200).json({ err: false, result }).send();
  });
});

/**
 * URL: /hub/vn/validate/:target
 * METHOD: GET
 * Description: GET Validate virtual network properties
 */

router.get('/:token', (req, res) => {
  req.checkParams({
    token: {
      notEmpty: true,
      isUUID_v4: true
    },
  });
  req.checkHeaders({
    resource: {
      isResourceToken: true
    }
  });
  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: errors }).send();
  }
  const token = req.params.token;
  global.sql.first('confirm-virtual-network-registration', [token], (err, result) => {
    if (err) {
      global.log.error(err);
      return res.status(200).json({
        err: true,
        err_msg: err,
      }).send();
    }
    return res.status(200).json({ err: false, result }).send();
  });
});


module.exports = router;
