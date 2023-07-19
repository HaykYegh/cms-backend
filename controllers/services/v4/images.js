const express = require('express');
const fs = require('fs');

const router = express.Router();

/**
 * URL: /v4/images/:category/:name
 * METHOD: GET
 * Description: Render image
 */

router.get('/:category/:name', (req, res) => {
  req.checkParams({
    category: {
      notEmpty: true,
      isString: true
    },
    name: {
      notEmpty: true,
      isString: true
    }
  });
  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: 'VALIDATION_ERROR', result: errors });
  }

  const imagePath = `${global.appRoot}/public/assets/${req.params.category}/${req.params.name}.png`;
  if (fs.existsSync(imagePath)) {
    return res.sendFile(imagePath);
  }

  return res.json({ err: true, err_msg: 'IMAGE_NOT_FOUNT' });
});

module.exports = router;
