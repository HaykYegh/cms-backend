const express = require('express');
const deviceService = require('../../services/device');
const awsService = require('../../services/aws');
const logger = require('../../services/logger');

const router = express.Router();


/**
 * URL: /v1/devices
 * METHOD: GET
 * Description: GET user devices
 */

router.get('/', (req, res) => {
  req.checkQuery({
    offset: {
      notEmpty: true
    },
    userId: {
      optional: true
    }
  });
  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: false, err_msg: errors }).send();
  }
  const limit = 50;
  const offset = req.query.offset * limit;
  const sqlOptions = {
    params: [limit, offset, req.customerId],
    query: 'devices'
  };
  if (req.query.userId) {
    const userId = parseInt(req.query.userId, 10);
    sqlOptions.query = 'user-devices';
    sqlOptions.params.push(userId);
  }


  global.sql.run(sqlOptions.query, sqlOptions.params, (err, devices) => {
    if (err) {
      global.log.error(err);
      const error = {
        err: true,
        err_msg: 'unable select devices',
      };
      return res.status(500).json(error).send();
    }
    return res.status(200).json({ err: false, result: devices }).send();
  });
});

/**
 * URL: /v1/devices/:deviceId
 * METHOD: GET
 * Description: GET device
 */

router.get('/migrate', (req, res) => {
  const customerId = req.customerId;

  try {
    // const result = await deviceService.migrate.notSpecified({ customerId });


    awsService.sesTest('zz');
    res.json({ err: false, result });
  } catch (e) {
    logger.error(e);
    res.json({ err: true, err_msg: 'DB_ERROR' });
  }
});
/**
 * URL: /v1/devices/:deviceId
 * METHOD: GET
 * Description: GET device
 */

router.get('/:deviceId', (req, res) => {
  req.checkParams({
    deviceId: {
      notEmpty: true,
    }
  });
  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: false, err_msg: errors }).send();
  }
  const deviceId = parseInt(req.params.deviceId, 10);
  global.sql.first('device', [deviceId, req.customerId], (err, device) => {
    if (err) {
      global.log.error(err);
      const error = {
        err: true,
        err_msg: 'unable select device',
      };
      return res.status(500).json(error).send();
    }
    return res.status(200).json({ err: false, result: device }).send();
  });
});


module.exports = router;
