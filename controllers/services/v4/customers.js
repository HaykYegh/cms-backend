const express = require('express');
const logger = require('../../../services/logger');
const customerService = require('../../../services/customers');
const adminService = require('../../../services/admin');
const utils = require('../../../helpers/utils');
const emailService = require('../../../services/email');

const router = express.Router();


/*
 * URL: /v4/customers/create
 * METHOD: POST
 * Description Create customer
 */
router.post('/create', async (req, res) => {
  req.checkBody({
    customerName: {
      notEmpty: true,
      isString: true
    },
    companyName: {
      notEmpty: true,
      isString: true
    },
    email: {
      notEmpty: true,
      isEmail: true
    },
    phone: {
      notEmpty: true,
      isNumber: true
    },
    organizationSize: {
      notEmpty: true,
      isString: true
    }
  });
  req.sanitize('email').normalizeEmail({ gmail_remove_dots: false });
  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: 'VALIDATION_ERROR', result: errors });
  }

  const companyName = req.body.companyName;
  const packageId = 4;
  const currency = 'USD';
  const email = req.body.email;
  const dailyAttemptsCount = 10;
  const totalAttemptsCount = 100;
  const password = utils.generatePassword(12);
  const customerName = req.body.customerName;
  const phone = req.body.phone;
  const organizationSize = req.body.organizationSize;

  try {
    const admin = await adminService.get.adminByEmail(null, email);
    if (admin) {
      return res.json({ err: true, result: 'EMAIL_ALREADY_EXISTS' });
    }
  } catch (e) {
    logger.error(e);
    res.json({ err: true, err_msg: 'DB_ERROR', result: e.message });
  }

  try {
    const prefix = customerService.createUniquePrefix();
    if (!prefix) {
      return res.json({ err: true, err_msg: 'DB_ERROR' });
    }
    const customer = await customerService.createCustomer({
      packageId,
      name: companyName,
      prefix,
      currency,
      dailyAttemptsCount,
      totalAttemptsCount,
      email,
      password,
      customerName,
      phone,
      organizationSize
    });

    const templateId = emailService.CONSTANTS.WELCOME_ZANGI_FOR_BUSINESS;
    const emailTemplate = await emailService.get.one(null, { templateId });
    const to = email;
    const subject = emailTemplate.subject;
    const message = utils.replaceAll(emailTemplate.content, {
      '{name}': customer.profile[0].value,
      '{email}': email,
      '{password}': password
    });
    await emailService.sendMail(prefix)({ to, subject, message });

    res.json({ err: false, result: { successful: true } });
  } catch (e) {
    logger.error(e);
    res.json({ err: true, err_msg: 'DB_ERROR', result: e.message });
  }
});

module.exports = router;
