const express = require('express');
const async = require('async');
const customerSerivce = require('../../services/customers');

const router = express.Router();

/**
 * URL: /v1/customers
 * METHOD: GET
 * Description: GET customers
 */

router.get('/', (req, res) => {
  global.sql.run('get-customers', [], (err, customers) => {
    if (err) {
      global.log.error(err);
      const error = {
        err: true,
        err_msg: 'unable select customers',
      };
      return res.status(500).json(error).send();
    }
    return res.status(200).json({ err: false, result: customers }).send();
  });
});

/**
 * URL: /v1/customers/:customer_id
 * METHOD: GET
 * Description: GET customer by customer_id
 */

router.get('/:customer_id', (req, res) => {
  req.checkParams({
    customer_id: {
      notEmpty: true,
    }
  });
  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: false, err_msg: errors }).send();
  }
  const customerId = parseInt(req.params.customer_id, 10);
  global.sql.first('get-customer-by-id', [customerId], (err, user) => {
    if (err) {
      global.log.error(err);
      const error = {
        err: true,
        err_msg: 'unable select customer',
      };
      return res.status(500).json(error).send();
    }

    return res.status(200).json({ err: false, result: user }).send();
  });
});

/**
 * URL: /v1/customers/:customer_id
 * METHOD: PUT
 * Description: Update customer by customer_id
 */

router.put('/:customer_id', (req, res) => {
  req.checkParams({
    customer_id: {
      notEmpty: true,
    }
  });
  req.checkBody({
    country: {
      isObject: true,
    },
    package: {
      isObject: true,
    },
    name: {
      notEmpty: true,
    },
    prefix: {
      notEmpty: true,
    },
    currency: {
      notEmpty: true,
    },
    status: {
      notEmpty: true,
    }
  });
  req.checkBody('country.value', 'Country field is required').notEmpty();
  req.checkBody('package.value', 'Package field is required').notEmpty();

  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: false, err_msg: errors }).send();
  }

  const customerId = parseInt(req.params.customer_id, 10);
  const body = req.body;

  const customerParams = [
    body.package.value,
    body.status,
    body.name,
    body.prefix,
    body.currency,
    body.country.value,
    customerId
  ];

  global.sql.run('update-customer-by-id', customerParams, (err, customer, query) => {
    if (err) {
      global.log.error(err);
      const error = {
        err: true,
        err_msg: 'unable select customer',
      };
      return res.status(500).json(error).send();
    }

    if (query.rowCount > 0) {
      return res.status(200).json({ err: false, result: true }).send();
    }

    return res.status(200).json({ err: true, err_msg: 'update error' }).send();
  });
});


/**
 * URL: /v1/customers
 * METHOD: POST
 * Description: Create customer
 */

router.post('/', (req, res) => {
  // Create customer
  // Create billing user
  // Create Sign in attempts limit
  // Create AWS bucket
  // Create default Administrator


  req.checkBody({
    name: {
      notEmpty: true,
      isString: true
    },
    prefix: {
      notEmpty: true,
      isString: true
    },
    currency: {
      notEmpty: true,
      isString: true
    },
    number: {
      notEmpty: true,
      isNumber: true
    },
    email: {
      notEmpty: true,
      isEmail: true
    },
    regionCode: {
      notEmpty: true,
      isString: true
    },
    dailyAttemptsCount: {
      notEmpty: true,
      isNumber: true
    },
    totalAttemptsCount: {
      notEmpty: true,
      isNumber: true
    }
  });
  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: 'VALIDATION_ERROR', result: errors }).send();
  }

  const body = req.body;

  const customerParams = {
    name: body.name,
    prefix: body.prefix,
    defaultNumber: body.number,
    defaultEmail: body.email,
    currency: body.currency,
    regionCode: body.regionCode,
    dailyAttemptsCount: body.dailyAttemptsCount,
    totalAttemptsCount: body.totalAttemptsCount,
  };


  console.log('## customerParams ##');
  console.log(customerParams);


  async.series({
    createCustomer: customerSerivce.createCustomer(customerParams),
    createBillingCustomer: customerSerivce.createBillingCustomer(customerParams),
  }, (err, result) => {
    if (err) {
      return res.status(200).json({ err: true, err_msg: 'CUSTOMER_CREATE_ERROR', result: err }).send();
    }
    return res.status(200).json({ err: false, result }).send();
  });
});


module.exports = router;
