const express = require('express');
const config = require('config');
const fetch = require('node-fetch');

const router = express.Router();

/**
 * URL: /v2/search-channel
 * METHOD: GET
 * Description: Get channels list
 */

router.get('/:value', async (req, res) => {
  req.checkQuery({
    value: {
      notEmpty: true,
      isString: true
    }
  });

  const customerId = req.customerId;
  const { value } = req.params;
  try {
    const openFireConf = config.get('openFire');
    const response = await fetch(`${openFireConf.host}/plugins/channels/search?customerId=${customerId}&key=${value}`)
    const json = await response.json();
    res.send(json);
  } catch (e) {
    res.send(e);
  }
});

module.exports = router;
