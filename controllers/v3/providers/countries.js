const express = require('express');
const providerService = require('../../../services/third-party-providers');
const logger = require('../../../services/logger');


const router = express.Router();


/**
 * URL: /v3/providers/countries
 * METHOD: GET
 * Description: list country providers
 */

router.get('/', async (req, res) => {
  const customerId = req.customerId;
  try {
    const result = await providerService
      .list.countryProviders(null, { customerId });
    res.json({ err: false, result });
  } catch (e) {
    logger.error(e);
    res.json({ err: true, err_msg: e.message });
  }
});


/**
 * URL: /v3/providers/countries/:countryId
 * METHOD: GET
 * Description: Get country providers
 */

router.get('/:countryId', async (req, res) => {
  req.checkParams({
    countryId: {
      notEmpty: true,
      isNumber: true
    }
  });

  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: 'VALIDATION_ERROR', result: errors });
  }

  const customerId = req.customerId;
  const countryId = req.params.countryId;

  try {
    const result = await providerService.retrieve.countryProviders(null, { customerId, countryId });
    res.json({ err: false, result });
  } catch (e) {
    logger.error(e);
    res.json({ err: true, err_msg: e.message });
  }
});

/**
 * URL: /v3/providers/countries/:countryProviderId
 * METHOD: DELETE
 * Description: Delete country provider
 */

router.delete('/:countryProviderId', async (req, res) => {
  req.checkParams({
    countryProviderId: {
      notEmpty: true,
      isNumber: true
    }
  });
  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: 'VALIDATION_ERROR', result: errors });
  }

  const customerId = req.customerId;
  const countryProviderId = req.params.countryProviderId;

  try {
    const result = await providerService
      .delete
      .countryProvider(null, { customerId, countryProviderId });
    res.json({ err: false, result });
  } catch (e) {
    logger.error(e);
    res.json({ err: true, err_msg: e.message });
  }
});

/**
 * URL: /v3/providers/countries
 * METHOD: POST
 * Description: Create country providers
 */

router.post('/', async (req, res) => {
  req.checkBody({
    countryProviderIds: {
      notEmpty: true,
      isArray: true
    }
  });
  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: 'VALIDATION_ERROR', result: errors });
  }

  const customerId = req.customerId;
  const countryProviderIds = req.body.countryProviderIds;

  try {
    const result = await providerService
      .create
      .countryProviders(null, { customerId, countryProviderIds });
    res.json({ err: false, result });
  } catch (e) {
    logger.error(e);
    res.json({ err: true, err_msg: e.message });
  }
});

module.exports = router;
