const express = require('express');
const request = require('request');
const config = require('config');
const async = require('async');
const promoService = require('../../services/promo');
const logger = require('../../services/logger');
const utils = require('../../helpers/utils');
const helpers = require('../../helpers');


const router = express.Router();

/**
 * URL: /v2/charging-cards
 * METHOD: POST
 * Description: POST Generate promo code
 */

router.post('/', (req, res) => {
  req.checkBody({
    amount: {
      notEmpty: true,
      isNumber: true
    },
    currency: {
      notEmpty: true,
    },
    count: {
      notEmpty: true,
      isNumber: true
    },
  });
  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: errors }).send();
  }

  const prefix = req.administrator.customer.prefix;
  const amount = req.body.amount;
  const currency = req.body.currency;
  const count = parseInt(req.body.count, 10);
  const billingConf = config.get(`billing.${helpers.getConfigKey(prefix)}`);
  const requestBaseUrl = `${billingConf.host}/jbilling/rest/chargingcard`;


  const newCards = Array(count).fill(0).map(() => ({
    code: promoService.generateNumbers(),
    currency,
    amount,
    prefix
  }));
  request.post(`${requestBaseUrl}/importChargingCards`, {
    json: {
      prefix,
      cards: JSON.stringify(newCards)
    }
  }, (err, httpResponse, billingResult) => {
    if (err) {
      logger.error(err);
      return res.json({ err: true, err_msg: 'BILLING_NETWORK_ERROR', result: err });
    }
    let result;
    try {
      result = JSON.parse(billingResult);
    } catch (e) {
      logger.error(result);
      return res.json({ err: true, err_msg: 'BILLING_SERVICE_ERROR', result: e.message });
    }
    if (result.error) {
      logger.error(result);
      return res.json({ err: true, err_msg: 'BILLING_SERVICE_ERROR', result });
    }


    return res.status(200).json({ err: false, result }).send();
  });
});

/**
 * URL: /v2/charging-cards
 * METHOD: GET
 * Description: GET charging card list
 */

router.get('/', (req, res) => {
  req.checkQuery({
    offset: {
      notEmpty: true,
      isNumber: true,
    }
  });
  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: errors }).send();
  }

  const prefix = req.administrator.customer.prefix;
  const offset = req.query.offset;

  const billingConf = config.get(`billing.${helpers.getConfigKey(prefix)}`);
  const requestBaseUrl = `${billingConf.host}/jbilling/rest/chargingcard`;


  async.parallel({
    chargingCards(callback) {
      request.get(`${requestBaseUrl}/getChargingCards`, {
        qs: {
          prefix,
          start: offset,
          limit: 20,
          card: ''
        }
      }, (err, httpResponse, result) => {
        if (err || result.err) {
          global.log.error(err);
          return callback('INVALID_RESPONSE', null);
        }
        let cards;
        try {
          cards = JSON.parse(result);
        } catch (e) {
          global.log.error(e);
          global.log.error(result);
          return callback({ err_msg: 'BILLING_SERVICE_ERROR', result: err }, null);
        }

        callback(null, cards.result);
      });
    },

    chargingCardCount(callback) {
      request.get(`${requestBaseUrl}/getChargingCardsCount`, {
        qs: {
          prefix
        }
      }, (err, httpResponse, result) => {
        if (err || result.err) {
          global.log.error(err);
          return callback('INVALID_RESPONSE', null);
        }
        let count;
        try {
          count = parseInt(result, 10);
        } catch (e) {
          global.log.error(e);
          global.log.error(result);
          return callback({ err_msg: 'BILLING_SERVICE_ERROR', result: err }, null);
        }
        callback(null, count.result);
      });
    },

  }, (err, result) => {
    if (err) {
      global.log.error(err);
      return res.json({ err: true, err_msg: 'CHARGING_CARD_ERROR', result: err }).send();
    }
    return res.status(200).json({ err: false, result }).send();
  });
});


/**
 * URL: /v2/charging-cards/used
 * METHOD: GET
 * Description: GET used charging card list
 */

router.get('/used', (req, res) => {
  req.checkQuery({
    offset: {
      notEmpty: true,
      isNumber: true,
    },
    startDate: {
      notEmpty: true,
      isDate: true
    },
    endDate: {
      notEmpty: true,
      isDate: true
    },
    username: {
      optional: true,
    },
  });
  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: errors }).send();
  }

  const prefix = req.administrator.customer.prefix;
  const offset = req.query.offset;
  const startDate = utils.getStartDateInt(req.query.startDate);
  const endDate = utils.getEndDateInt(req.query.endDate);
  const username = prefix + req.query.username || '';
  const billingConf = config.get(`billing.${helpers.getConfigKey(prefix)}`);
  const requestBaseUrl = `${billingConf.host}/jbilling/rest/chargingcard`;

  async.parallel({
    usedCards(callback) {
      request.get(`${requestBaseUrl}/getUsedChargingCardsByDate`, {
        qs: {
          prefix,
          start: offset,
          limit: 20,
          card: '',
          startDate,
          endDate,
          username
        }
      }, (err, httpResponse, result) => {
        if (err || result.err) {
          global.log.error(err);
          return callback('INVALID_RESPONSE', null);
        }
        const cards = JSON.parse(result);
        callback(null, cards);
      });
    },

    usedAmount(callback) {
      request.get(`${requestBaseUrl}/getUsedChargingCardsAmountByDate`, {
        qs: {
          prefix,
          startDate,
          endDate
        }
      }, (err, httpResponse, result) => {
        if (err || result.err) {
          global.log.error(err);
          return callback('INVALID_RESPONSE', null);
        }
        const count = parseInt(result, 10);
        callback(null, count);
      });
    },

  }, (err, result) => {
    if (err) {
      global.log.error(err);
      return res.json({ err: true, err_msg: 'CHARGING_CARD_ERROR', result: err }).send();
    }
    return res.status(200).json({ err: false, result }).send();
  });
});


/**
 * URL: /v2/charging-cards/:code
 * METHOD: GET
 * Description: GET charging card by code
 */

router.get('/:code', (req, res) => {
  req.checkParams({
    code: {
      notEmpty: true
    }
  });
  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: false, err_msg: errors }).send();
  }
  const prefix = req.administrator.customer.prefix;
  const code = req.params.code;
  const billingConf = config.get(`billing.${helpers.getConfigKey(prefix)}`);
  const requestBaseUrl = `${billingConf.host}/jbilling/rest/chargingcard`;

  request.get(`${requestBaseUrl}/getUnusedChargingCards`, {
    qs: {
      prefix,
      start: 0,
      limit: 1,
      card: code
    }
  }, (err, httpResponse, result) => {
    if (err || result.err) {
      global.log.error(err);
      return res.json({ err: true, err_msg: 'CHARGING_CARD_ERROR', result: err }).send();
    }
    const card = JSON.parse(result);
    return res.status(200).json({ err: false, result: card[0] }).send();
  });
});


module.exports = router;
