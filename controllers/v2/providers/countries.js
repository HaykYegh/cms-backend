const express = require('express');
const logger = require('../../../services/logger');
const providerService = require('../../../services/third-party-providers');

const router = express.Router();


/**
 * URL: /v2/providers/:providerId/countries
 * METHOD: GET
 * Description: Get provider countries
 */

router.get('/:providerId/countries', async (req, res) => {
  req.checkQuery({
    offset: {
      notEmpty: true,
      isNumber: true
    },
    limit: {
      notEmpty: true,
      isNumber: true
    }
  });
  req.checkParams({
    providerId: {
      notEmpty: true,
      isNumber: true
    }
  });

  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: 'VALIDATION_ERROR', result: errors });
  }

  const customerId = req.customerId;
  const providerId = req.params.providerId;
  const limit = +req.query.limit;
  const offset = +req.query.offset * limit;

  try {
    const result = await providerService
      .list
      .countries(null, { customerId, providerId, limit, offset });
    res.json({ err: false, result });
  } catch (e) {
    logger.error(e);
    res.json({ err: true, err_msg: e.message });
  }
});


/**
 * URL: /v2/providers/:providerId/countries/count
 * METHOD: GET
 * Description: Get count of  provider countries
 */

router.get('/:providerId/countries/count', async (req, res) => {
  req.checkParams({
    providerId: {
      notEmpty: true,
      isNumber: true
    }
  });

  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: 'VALIDATION_ERROR', result: errors });
  }

  const customerId = req.customerId;
  const providerId = req.params.providerId;

  try {
    const result = await providerService
      .count
      .countries(null, { customerId, providerId });
    res.json({ err: false, result });
  } catch (e) {
    logger.error(e);
    res.json({ err: true, err_msg: e.message });
  }
});


/**
 * URL: /v2/providers/:providerId/countries
 * METHOD: POST
 * Description: Create provider country
 */

router.post('/:providerId/countries', async (req, res) => {
  req.checkBody({
    countryId: {
      notEmpty: true,
      isNumber: true
    }
  });
  req.checkParams({
    providerId: {
      notEmpty: true,
      isNumber: true
    }
  });

  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: 'VALIDATION_ERROR', result: errors });
  }
  const customerId = req.customerId;
  const providerId = req.params.providerId;
  const countryId = req.body.countryId;

  try {
    const result = await providerService
      .create
      .country(null, { customerId, providerId, countryId });
    res.json({ err: false, result });
  } catch (e) {
    logger.error(e);
    res.json({ err: true, err_msg: e.message });
  }
});

/**
 * URL: /v2/providers/:providerId/countries/:providerCountryId
 * METHOD: DELETE
 * Description: Delete provider country
 */

router.delete('/:providerId/countries/:providerCountryId', async (req, res) => {
  req.checkParams({
    providerId: {
      notEmpty: true,
      isNumber: true
    },
    providerCountryId: {
      notEmpty: true,
      isNumber: true
    }
  });

  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: 'VALIDATION_ERROR', result: errors });
  }

  const customerId = req.customerId;
  const providerId = req.params.providerId;
  const providerCountryId = req.params.providerCountryId;


  try {
    const result = await providerService
      .delete
      .country(null, { customerId, providerId, providerCountryId });
    res.json({ err: false, result });
  } catch (e) {
    logger.error(e);
    res.json({ err: true, err_msg: e.message });
  }
});


module.exports = router;
