const express = require('express');
const paymentInvoiceService = require('../../../../services/payment/invoice');
const logger = require('../../../../services/logger');

const router = express.Router();


/**
 * URL: /networks/v1/invoices/upcoming
 * METHOD: GET
 * Description: Get customer upcoming invoice
 */

router.get('/upcoming', async (req, res) => {
  const { customerId, adminId, networkId } = req;
  try {
    const result = await paymentInvoiceService
      .upcoming({ customerId, adminId, networkId });
    res.json({ err: false, result });
  } catch (e) {
    logger.error(e);
    res.json({ err: true, err_msg: 'UPCOMING_INVOICE_ERROR', result: e.message });
  }
});
/**
 * URL: /networks/v1/invoices
 * METHOD: GET
 * Description: Get customer invoices
 */

router.get('/', async (req, res) => {
  req.checkQuery({
    startingAfter: {
      optional: true,
      isString: true
    },
    endingBefore: {
      optional: true,
      isString: true
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

  const { customerId, adminId, networkId } = req;
  const limit = parseInt(req.query.limit, 10);
  const startingAfter = req.query.startingAfter || '';
  const endingBefore = req.query.endingBefore || '';

  try {
    const result = await paymentInvoiceService
      .list({ customerId, adminId, networkId, limit, startingAfter, endingBefore });
    res.json({ err: false, result });
  } catch (e) {
    logger.error(e);
    res.json({ err: true, err_msg: 'INVOICE_LIST_ERROR', result: e.message });
  }
});


/**
 * URL: /networks/v1/invoices/:invoiceId
 * METHOD: GET
 * Description: Get invoice
 */

router.get('/:invoiceId', async (req, res) => {
  req.checkParams({
    invoiceId: {
      notEmpty: true,
      isString: true
    }
  });
  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: 'VALIDATION_ERROR', result: errors });
  }

  const { invoiceId } = req.params;
  const { customerId, adminId, networkId } = req;

  try {
    const result = await paymentInvoiceService
      .retrieve({ customerId, adminId, networkId, invoiceId });
    res.json({ err: false, result });
  } catch (e) {
    logger.error(e);
    res.json({ err: true, err_msg: 'INVOICE_RETRIEVE_ERROR', result: e.message });
  }
});


module.exports = router;
