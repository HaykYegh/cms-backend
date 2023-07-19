const express = require('express');
const { list, count, remove } = require('../../../../services/network/services/users');
const logger = require('../../../../services/logger');

const router = express.Router();


/**
 * URL: /networks/v1/services/:serviceId/users
 * METHOD: GET
 * Description: Get service invites
 */

router.get('/:serviceId/users', async (req, res) => {
  req.checkParams({
    serviceId: {
      notEmpty: true,
      isNumber: true
    }
  });
  req.checkQuery({
    offset: {
      notEmpty: true,
      isNumber: true
    },
    limit: {
      notEmpty: true,
      isNumber: true
    },
    registrationStartDate: {
      optional: true,
      isDate: true
    },
    registrationEndDate: {
      optional: true,
      isDate: true
    },
    countryId: {
      optional: true,
      isNumber: true
    },
    platformId: {
      optional: true,
      isNumber: true
    },
    q: {
      optional: true,
      isString: true
    }
  });

  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: 'VALIDATION_ERROR', result: errors });
  }

  const customerId = req.customerId;
  const networkId = req.networkId;
  const serviceId = +req.params.serviceId;

  const limit = +req.query.limit;
  const offset = +req.query.offset * limit;

  const queryParams = {
    customerId,
    networkId,
    serviceId,
    registrationStartDate: req.query.registrationStartDate || null,
    registrationEndDate: req.query.registrationEndDate || null,
    countryId: req.query.countryId || null,
    platformId: req.query.platformId || null,
    q: req.query.q || null,
    limit,
    offset
  };
  try {
    const result = await list.users(null, queryParams);
    res.json({ err: false, result });
  } catch (e) {
    logger.error(e);
    res.json({ err: true, err_msg: e.message, result: e });
  }
});


/**
 * URL: /networks/v1/services/:serviceId/users/count
 * METHOD: GET
 * Description: Get service invites count
 */

router.get('/:serviceId/users/count', async (req, res) => {
  req.checkParams({
    serviceId: {
      notEmpty: true,
      isNumber: true
    }
  });
  req.checkQuery({
    registrationStartDate: {
      optional: true,
      isDate: true
    },
    registrationEndDate: {
      optional: true,
      isDate: true
    },
    countryId: {
      optional: true,
      isNumber: true
    },
    platformId: {
      optional: true,
      isNumber: true
    },
    q: {
      optional: true,
      isString: true
    }
  });

  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: 'VALIDATION_ERROR', result: errors });
  }

  const customerId = req.customerId;
  const networkId = req.networkId;
  const serviceId = +req.params.serviceId;

  const queryParams = {
    customerId,
    networkId,
    serviceId,
    registrationStartDate: req.query.registrationStartDate || null,
    registrationEndDate: req.query.registrationEndDate || null,
    countryId: req.query.countryId || null,
    platformId: req.query.platformId || null,
    q: req.query.q || null
  };
  try {
    const result = await count.users(null, queryParams);
    res.json({ err: false, result });
  } catch (e) {
    logger.error(e);
    res.json({ err: true, err_msg: e.message, result: e });
  }
});


/**
 * URL: /networks/v1/services/:serviceId/users/:userId
 * METHOD: DELETE
 * Description: Remove user from service
 */

router.delete('/:serviceId/users/:userId', async (req, res) => {
  req.checkParams({
    serviceId: {
      notEmpty: true,
      isNumber: true
    },
    userId: {
      notEmpty: true,
      isNumber: true
    }
  });
  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: 'VALIDATION_ERROR', result: errors });
  }

  const customerId = req.customerId;
  const networkId = req.networkId;
  const serviceId = +req.params.serviceId;
  const userId = +req.params.userId;


  try {
    const result = await remove.user(null, { customerId, networkId, serviceId, userId });
    res.json({ err: false, result });
  } catch (e) {
    logger.error(e);
    res.json({ err: true, err_msg: e.message });
  }
});

module.exports = router;
