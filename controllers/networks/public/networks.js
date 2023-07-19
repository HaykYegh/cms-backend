const express = require('express');
const logger = require('../../../services/logger');
const networkService = require('../../../services/network');

const router = express.Router();

/**
 * URL: /networks/public/networks
 * METHOD: GET
 * Description: Get virtual networks by params
 */

router.get('/', async (req, res) => {
  const customerId = req.customerId;
  const nickname = req.query.nickname;
  const email = req.query.email;

  try {
    const result = await networkService
      .get
      .all
      .networkByEmailOrNickname(null, { customerId, nickname, email });
    res.json({ error: false, result });
  } catch (e) {
    logger.error(e);
    res.json({ error: true, errorMessage: e.message });
  }
});

/**
 * URL: /networks/public/networks
 * METHOD: GET
 * Description: Get virtual networks by params
 */

router.post('/', async (req, res) => {
  req.checkBody({
    email: {
      notEmpty: true,
      isEmail: true
    },
    password: {
      notEmpty: true,
      isString: true
    },
    networkFullName: {
      notEmpty: true,
      isString: true
    },
    firstName: {
      notEmpty: true,
      isString: true
    },
    lastName: {
      notEmpty: true,
      isString: true
    },
    nickname: {
      notEmpty: true,
      isString: true
    }
  });

  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: 'VALIDATION_ERROR', result: errors });
  }

  const customerId = req.customerId;
  const { email, nickname, password, networkFullName, firstName, lastName } = req.body;

  try {
    const result = await networkService
      .create.request(null,
        { customerId, email, nickname, password, networkFullName, firstName, lastName });
    res.json({ error: false, result });
  } catch (e) {
    logger.error(e);
    res.json({ error: true, errorMessage: e.message });
  }
});


/**
 * URL: /networks/public/networks
 * METHOD: PUT
 * Description: Validate and verify network request
 */

router.put('/:token', async (req, res) => {
  req.checkParams({
    token: {
      notEmpty: true,
      isString: true
    }
  });

  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: 'VALIDATION_ERROR', result: errors });
  }

  const customerId = req.customerId;
  const { token } = req.params;

  try {
    const result = await networkService
      .create.networkWithRequest(null, { customerId, token });
    res.json({ error: false, result: result.network });
  } catch (e) {
    logger.error(e);
    res.json({ error: true, errorMessage: e.message });
  }
});

/**
 * URL: /networks/public/networks
 * METHOD: PUT
 * Description: Validate and verify network request
 */

router.get('/:token', async (req, res) => {
  req.checkParams({
    token: {
      notEmpty: true,
      isString: true
    }
  });

  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: 'VALIDATION_ERROR', result: errors });
  }

  const customerId = req.customerId;
  const { token } = req.params;

  try {
    const result = await networkService
      .get.one.byInviteOrNickname(null, { customerId, token });

    res.json({ error: false, result });
  } catch (e) {
    logger.error(e);
    res.json({ error: true, errorMessage: e.message });
  }
});


module.exports = router;
