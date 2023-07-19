const express = require('express');

const router = express.Router();

/**
 * URL: /v1/misc/countries
 * METHOD: GET
 * Description: Get countries
 */

router.get('/countries', (req, res) => {
  global.sql.run('get-countries', (err, result) => {
    if (err) {
      return res.status(200).json({ err: true, result: 'DATABASE_ERROR' }).send();
    }
    return res.status(200).json({ err: false, result }).send();
  });
});

/**
 * URL: /v1/misc/platforms
 * METHOD: GET
 * Description: GET platforms
 */

router.get('/platforms', (req, res) => {
  global.sql.run('attr-platforms', [], (err, platforms) => {
    if (err) {
      global.log.error(err);
      const error = {
        err: true,
        err_msg: 'unable select platforms',
      };
      return res.status(500).json(error).send();
    }
    return res.status(200).json({ err: false, result: platforms }).send();
  });
});

module.exports = router;
