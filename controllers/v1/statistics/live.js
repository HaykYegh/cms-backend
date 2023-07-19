const express = require('express');
const config = require('config');
const request = require('request');
const queryString = require('querystring');

const router = express.Router();


/*
 * URL: /v1/statistics/live
 * METHOD: GET
 * Description: Get live statistics
 */


router.get('/', (req, res) => {
  const openFireConf = config.get('openFire');
  const prefix = req.administrator.customer.prefix;
  // TODO FIX naming issue
  const fuckingNamingIssueByChayniks = prefix === 'pn' ? 'pinnglebilling' : 'zangibilling';
  const requestUrl = `${openFireConf.host}/plugins/${fuckingNamingIssueByChayniks}/getstatistic`;


  request.get(requestUrl, {
    qs: { prefix }
  }, (err, httpResponse, result) => {
    if (err || result.err) {
      global.log.error(err);
      return res.json({ err: true, err_msg: 'SIGNALING_SERVICE_ERROR', result: err }).send();
    }
    let data;
    try {
      data = JSON.parse(result);
    } catch (e) {
      global.log.error(e);
      global.log.error(result);
      return res.json({ err: true, err_msg: 'BILLING_SERVICE_ERROR', result }).send();
    }

    const metrics = {
      voip_call: data.voipCallCount,
      call: data.callCount,
      back_termination: data.backCallCount,
      online_users: data.sessionCount,
    };
    return res.json({ err: false, result: metrics }).send();
  });
});


module.exports = router;
