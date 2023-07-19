const express = require('express');

const router = express.Router();


/**
 * URL: /v1/stickers/statuses
 * METHOD: GET
 * Description: get Sticker statuses
 */
router.get('/', (req, res) => {
  global.sql.run('stickers-get-statuses', [], (err, result) => {
    if (err) {
      global.log.error(err);
      return res.status(200).json({ err: true, err_msg: 'DB_GET_ERROR', result: err }).send();
    }
    return res.status(200).json({ err: false, result }).send();
  });
});


module.exports = router;
