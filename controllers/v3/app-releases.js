const express = require('express');
const appReleasesService = require('../../services/app-releases');
const logger = require('../../services/logger');
const customerService = require('../../services/customers');
const systemMessageService = require('../../services/system-message');
const _chunk = require('lodash/chunk');


const router = express.Router();


/**
 * URL: /v3/app-releases
 * METHOD: GET
 * Description: GET release change logs
 */

router.get('/', async (req, res) => {
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
  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: 'VALIDATION_ERROR', result: errors });
  }
  const limit = +req.query.limit;
  const offset = +req.query.offset * limit;
  const customerId = req.customerId;

  try {
    const result = await appReleasesService.list.appReleases(null, { customerId, limit, offset });
    res.json({ err: false, result });
  } catch (e) {
    logger.error(e);
    res.json({ err: true, err_msg: e.message });
  }
});


/**
 * URL: /v3/app-releases/count
 * METHOD: GET
 * Description: Get app releases count
 */

router.get('/count', async (req, res) => {
  const customerId = req.customerId;
  try {
    const result = await appReleasesService.count.appReleases(null, { customerId });
    res.json({ err: false, result });
  } catch (e) {
    logger.error(e);
    res.json({ err: true, err_msg: e.message });
  }
});


/**
 * URL: /v3/app-releases/:userGroupId
 * METHOD: GET
 * Description: Get user group
 */

router.get('/:appReleaseId', async (req, res) => {
  req.checkParams({
    appReleaseId: {
      notEmpty: true,
      isNumber: true
    }
  });

  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: 'VALIDATION_ERROR', result: errors });
  }

  const customerId = req.customerId;
  const appReleaseId = req.params.appReleaseId;

  try {
    const result = await appReleasesService
      .retrieve
      .appRelease(null, { customerId, appReleaseId });
    res.json({ err: false, result });
  } catch (e) {
    logger.error(e);
    res.json({ err: true, err_msg: e.message });
  }
});

/**
 * URL: /v3/app-releases
 * METHOD: POST
 * Description: Create app release note
 */

router.post('/', async (req, res) => {
  req.checkBody({
    platformId: {
      notEmpty: true,
      isNumber: true
    },
    version: {
      notEmpty: true,
      isString: true
    }
  });
  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: 'VALIDATION_ERROR', result: errors });
  }

  const customerId = req.customerId;
  const version = req.body.version;
  const platformId = req.body.platformId;

  try {
    const result = await appReleasesService
      .create
      .appRelease(null, { customerId, version, platformId });

    res.json({ err: false, result });
  } catch (e) {
    logger.error(e);
    res.json({ err: true, err_msg: e.message });
  }
});


/**
 * URL: /v3/app-releases/:appReleaseId
 * METHOD: PUT
 * Description: Update app release note
 */

router.put('/:appReleaseId', async (req, res) => {
  req.checkBody({
    platformId: {
      notEmpty: true,
      isNumber: true
    },
    version: {
      notEmpty: true,
      isString: true
    }
  });
  req.checkParams({
    appReleaseId: {
      notEmpty: true,
      isNumber: true
    }
  });
  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: 'VALIDATION_ERROR', result: errors });
  }

  const customerId = req.customerId;
  const appReleaseId = req.params.appReleaseId;
  const platformId = req.body.platformId;
  const version = req.body.version;

  try {
    const result = await appReleasesService
      .update
      .appRelease(null, { customerId, appReleaseId, platformId, version });

    res.json({ err: false, result });
  } catch (e) {
    logger.error(e);
    res.json({ err: true, err_msg: e.message });
  }
});


/**
 * URL: /v3/app-releases/:appReleaseId
 * METHOD: DELETE
 * Description: Delete app release note
 */

router.delete('/:appReleaseId', async (req, res) => {
  req.checkParams({
    appReleaseId: {
      notEmpty: true,
      isNumber: true
    }
  });
  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: 'VALIDATION_ERROR', result: errors });
  }

  const customerId = req.customerId;
  const appReleaseId = req.params.appReleaseId;

  try {
    const result = await appReleasesService
      .delete
      .appRelease(null, { customerId, appReleaseId });

    res.json({ err: false, result });
  } catch (e) {
    logger.error(e);
    res.json({ err: true, err_msg: e.message });
  }
});


/**
 * URL: /v3/app-releases/:appReleaseId/languages
 * METHOD: POST
 * Description: Create app release note
 */

router.post('/:appReleaseId/languages', async (req, res) => {
  req.checkParams({
    appReleaseId: {
      notEmpty: true,
      isNumber: true
    }
  });
  req.checkBody({
    langId: {
      notEmpty: true,
      isNumber: true
    },
    title: {
      optional: true,
      isString: true
    },
    description: {
      notEmpty: true,
      isString: true
    }
  });
  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: 'VALIDATION_ERROR', result: errors });
  }

  const customerId = req.customerId;
  const appReleaseId = req.params.appReleaseId;
  const langId = req.body.langId;
  const title = req.body.title || '';
  const description = req.body.description;

  try {
    const result = await appReleasesService
      .upsert
      .appReleaseLang(null, { customerId, appReleaseId, langId, title, description });

    res.json({ err: false, result });
  } catch (e) {
    logger.error(e);
    res.json({ err: true, err_msg: e.message });
  }
});


/**
 * URL: /v3/app-releases/:appReleaseId/languages
 * METHOD: GET
 * Description: Retrieve app release notes
 */

router.get('/:appReleaseId/languages', async (req, res) => {
  req.checkParams({
    appReleaseId: {
      notEmpty: true,
      isNumber: true
    }
  });
  req.checkQuery({
    langId: {
      notEmpty: true,
      isNumber: true
    }
  });
  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: 'VALIDATION_ERROR', result: errors });
  }

  const customerId = req.customerId;
  const appReleaseId = req.params.appReleaseId;
  const langId = req.query.langId;

  try {
    const result = await appReleasesService
      .retrieve
      .appReleaseLang(null, { customerId, appReleaseId, langId });

    res.json({ err: false, result });
  } catch (e) {
    logger.error(e);
    res.json({ err: true, err_msg: e.message });
  }
});

/**
 * URL: /v3/app-releases/:appReleaseId/broadcast
 * METHOD: POST
 * Description: Broadcast all users about new app version
 */

router.post('/:appReleaseId/broadcast', async (req, res) => {
  req.checkParams({
    appReleaseId: {
      notEmpty: true,
      isNumber: true
    }
  });
  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: 'VALIDATION_ERROR', result: errors });
  }

  const customerId = req.customerId;
  const appReleaseId = req.params.appReleaseId;


  try {
    await appReleasesService
      .create
      .broadcast({ customerId, appReleaseId });

    res.json({ err: false, result: { isPublished: true } });
  } catch (e) {
    console.log(e);
    // logger.error(e);
    res.json({ err: true, err_msg: e.message });
  }
});


module.exports = router;
