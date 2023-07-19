const express = require('express');
const logger = require('../../../services/logger');
const serviceService = require('../../../services/network/services');
const systemMessageService = require('../../../services/system-message');

const router = express.Router();


/**
 * URL: /networks/public/services
 * METHOD: GET
 * Description: Get service by token or nickname
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

  const customerId = req.customerId || 1;
  const { token } = req.params;


  console.log(token);
  console.log(customerId);

  try {
    const result = await serviceService
      .retrieve
      .serviceByNicknameOrToken(null, { customerId, token });

    if (!result || !result.serviceId) {
      throw new Error('INVALID_SERVICE');
    }

    // const serviceId = result.serviceId;

    // const senderImages = await systemMessageService.senders.list.images(null, { customerId, serviceId });

    // console.log(senderImages);

    res.json({ error: false, result: { ...result } });
  } catch (e) {
    logger.error(e);
    res.json({ error: true, errorMessage: e.message });
  }
});


module.exports = router;
