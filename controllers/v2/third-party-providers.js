const express = require('express');
const async = require('async');
const fs = require('fs');
const providerService = require('../../services/third-party-providers');
const sql = require('../../services/db').getDB();
const redisService = require('../../services/redis');

const router = express.Router();


/**
 * URL: /v2/third-party-providers/cache
 * METHOD: POST
 * Description: POST update third party provider.
 */

router.post('/cache', (req, res) => {
  const customerId = req.customerId;
  const prefix = req.administrator.customer.prefix;
  const limit = 1000;
  const offset = 0;

  const sqlQuery = {
    params: [
      customerId,
      limit,
      offset
    ],
    raw: fs.readFileSync('sql/third-party-providers/get-third-party-providers.sql').toString()
  };
  sql.query(sqlQuery.raw, sqlQuery.params)
    .then((data) => {
      const result = data.rows;
      if (!result.length === 0) {
        return res.json({ err: true, err_msg: 'PROVIDERS_NOT_FOUND' }).send();
      }
      const providers = {};
      // eslint-disable-next-line no-restricted-syntax
      for (const provider of result) {
        providers[provider.customerThirdPartyProviderId] = JSON.stringify(provider);
      }
      redisService.getCache().hmset(`${redisService.CONSTANTS.HASH.THIRD_PARTY_PROVIDERS}#${prefix}`, providers, (err, reply) => {
        if (err) {
          return res.json({ err: true, err_msg: 'CACHE_ERROR' }).send();
        }
        res.json({ err: false, result: { reply } }).send();
      });
    })
    .catch((err) => {
      global.log.error('### sqlQuery ###');
      global.log.error(sqlQuery);
      global.log.error(err);
      res.json({ err: true, err_msg: 'DB_ERROR', result: err }).send();
    });
});


/**
 * URL: /v2/third-party-providers
 * METHOD: GET
 * Description: GET third party provider list
 */

router.get('/', (req, res) => {
  req.checkQuery({
    offset: {
      notEmpty: true
    }
  });
  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: errors }).send();
  }
  const limit = 20;
  const offset = parseInt(req.query.offset, 10) * limit;
  const customerId = req.customerId;


  const sqlQuery = {
    params: [
      customerId, limit, offset
    ],
    raw: fs.readFileSync('sql/third-party-providers/get-third-party-providers.sql').toString()
  };

  sql.query(sqlQuery.raw, sqlQuery.params)
    .then((data) => {
      const result = data.rows;
      res.json({ err: false, result }).send();
    })
    .catch((err) => {
      global.log.error('### sqlQuery ###');
      global.log.error(sqlQuery);
      global.log.error(err);
      res.json({ err: true, err_msg: 'DB_ERROR', result: err }).send();
    });
});

/**
 * URL: /v2/third-party-providers/types
 * METHOD: GET
 * Description: GET third party provider types
 */

router.get('/types', (req, res) => {
  const sqlQuery = {
    params: [],
    raw: fs.readFileSync('sql/third-party-providers/get-third-party-provider-types.sql').toString()
  };
  sql.query(sqlQuery.raw, sqlQuery.params)
    .then((data) => {
      const result = data.rows;
      res.json({ err: false, result }).send();
    })
    .catch((err) => {
      global.log.error('### sqlQuery ###');
      global.log.error(sqlQuery);
      global.log.error(err);
      res.json({ err: true, err_msg: 'DB_ERROR', result: err }).send();
    });
});

/**
 * URL: /v2/third-party-providers/:thirdPartyProviderId
 * METHOD: GET
 * Description: GET third party provider item
 */

router.get('/:thirdPartyProviderId', (req, res) => {
  req.checkParams({
    thirdPartyProviderId: {
      notEmpty: true,
      isNumber: true
    }
  });
  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: errors }).send();
  }
  const customerId = req.customerId;
  const thirdPartyProviderId = req.params.thirdPartyProviderId;

  const sqlQuery = {
    params: [customerId, thirdPartyProviderId],
    raw: fs.readFileSync('sql/third-party-providers/get-third-party-provider.sql').toString()
  };
  sql.query(sqlQuery.raw, sqlQuery.params)
    .then((data) => {
      const result = data.rows[0];
      res.json({ err: false, result }).send();
    })
    .catch((err) => {
      global.log.error('### sqlQuery ###');
      global.log.error(sqlQuery);
      global.log.error(err);
      res.json({ err: true, err_msg: 'DB_ERROR', result: err }).send();
    });
});


/**
 * URL: /v2/third-party-providers
 * METHOD: POST
 * Description: POST Create third party provider, SMS, Voice Message etc ...
 */

router.post('/', (req, res) => {
  req.checkBody({
    order: {
      notEmpty: true,
    },
    thirdPartyProviderId: {
      notEmpty: true,
    },
    config: {
      notEmpty: true,
      isObject: true
    }
  });
  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: errors }).send();
  }
  const customerId = req.customerId;
  const order = req.body.order;
  const active = true;
  const thirdPartyProviderId = req.body.thirdPartyProviderId;
  const config = JSON.stringify(req.body.config);

  const sqlQuery = {
    params: [
      customerId,
      active,
      thirdPartyProviderId,
      order,
      config
    ],
    raw: fs.readFileSync('sql/third-party-providers/create-third-party-provider.sql').toString()
  };

  console.log(sqlQuery.params);


  sql.query(sqlQuery.raw, sqlQuery.params)
    .then((data) => {
      const result = data.rows[0];
      res.json({ err: false, result }).send();
    })
    .catch((err) => {
      // global.log.error('### sqlQuery ###');
      // global.log.error(sqlQuery);
      console.log(err);
      res.json({ err: true, err_msg: 'DB_ERROR', result: err }).send();
    });
});


/**
 * URL: /v2/third-party-providers/:thirdPartyProviderId
 * METHOD: PUT
 * Description: PUT update third party provider.
 */

router.put('/:thirdPartyProviderId', (req, res) => {
  req.checkBody({
    order: {
      notEmpty: true,
      isNumber: true,
    },
    active: {
      notEmpty: true,
      isBoolean: true,
    },
    config: {
      notEmpty: true,
      isObject: true
    }
  });
  req.checkParams({
    thirdPartyProviderId: {
      notEmpty: true,
      isNumber: true,
    },
  });
  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: errors }).send();
  }
  const customerId = req.customerId;
  const active = req.body.active;
  const thirdPartyProviderId = req.params.thirdPartyProviderId;
  const order = req.body.order;
  const config = JSON.stringify(req.body.config);

  const sqlQuery = {
    params: [
      customerId,
      thirdPartyProviderId,
      active,
      order,
      config
    ],
    raw: fs.readFileSync('sql/third-party-providers/update-third-party-provider.sql').toString()
  };
  sql.query(sqlQuery.raw, sqlQuery.params)
    .then((data) => {
      if (!data.rows[0]) {
        res.json({ err: true, err_msg: 'NOT_FOUND' }).send();
      } else {
        const result = data.rows[0];
        res.json({ err: false, result }).send();
      }
    })
    .catch((err) => {
      global.log.error('### sqlQuery ###');
      global.log.error(sqlQuery);
      global.log.error(err);
      res.json({ err: true, err_msg: 'DB_ERROR', result: err }).send();
    });
});


/**
 * URL: /v2/third-party-providers/:thirdPartyProviderId
 * METHOD: POST
 * Description: POST third party provider activate or deactivate
 */

router.post('/:thirdPartyProviderId/active', (req, res) => {
  req.checkParams({
    thirdPartyProviderId: {
      notEmpty: true
    }
  });
  req.checkBody({
    status: {
      notEmpty: true,
      isBoolean: true
    }
  });
  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: errors }).send();
  }
  const customerId = req.customerId;
  const thirdPartyProviderId = req.params.thirdPartyProviderId;
  const status = !!req.body.status;

  const sqlQuery = {
    params: [customerId, thirdPartyProviderId, status],
    raw: fs.readFileSync('sql/third-party-providers/activation-or-deactivation-third-party-provider.sql').toString()
  };
  sql.query(sqlQuery.raw, sqlQuery.params)
    .then((data) => {
      const result = data.rows[0];
      res.json({ err: false, result }).send();
    })
    .catch((err) => {
      global.log.error('### sqlQuery ###');
      global.log.error(sqlQuery);
      global.log.error(err);
      res.json({ err: true, err_msg: 'DB_ERROR', result: err }).send();
    });
});


/**
 * URL: /v2/third-party-providers/:thirdPartyProviderId/send
 * METHOD: POST
 * Description: POST update third party provider.
 */

router.post('/:thirdPartyProviderId/send', (req, res) => {
  req.checkBody({
    to: {
      notEmpty: true,
      isNumber: true,
    },
    message: {
      notEmpty: true,
      isString: true,
    },
  });
  req.checkParams({
    thirdPartyProviderId: {
      notEmpty: true,
      isNumber: true
    },
  });
  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: errors }).send();
  }
  const customerId = req.customerId;
  const customerThirdPartyProviderId = req.params.thirdPartyProviderId;
  const toNumber = req.body.to;
  const message = req.body.message;

  if (providerService.has(customerThirdPartyProviderId)) {
    providerService.send({ customerThirdPartyProviderId, toNumber, message }, (err, answer) => {
      if (err) {
        return res.json({ err: true, err_msg: err }).send();
      }
      return res.json({ err: false, result: answer }).send();
    });
  } else {
    const sqlQuery = {
      params: [
        customerId,
        customerThirdPartyProviderId,
      ],
      raw: fs.readFileSync('sql/third-party-providers/get-third-party-provider.sql').toString()
    };
    sql.query(sqlQuery.raw, sqlQuery.params)
      .then((data) => {
        const result = data.rows[0];

        if (!result) {
          return res.json({ err: true, err_msg: 'PROVIDER_NOT_FOUND' }).send();
        }
        providerService.set(result);
        providerService.send({ customerThirdPartyProviderId, toNumber, message }, (err, answer) => {
          if (err) {
            return res.json({ err: true, err_msg: err }).send();
          }
          return res.json({ err: false, result: answer }).send();
        });
      })
      .catch((err) => {
        global.log.error('### sqlQuery ###');
        global.log.error(sqlQuery);
        global.log.error(err);
        res.json({ err: true, err_msg: 'DB_ERROR', result: err }).send();
      });
  }
});

/**
 * URL: /v2/third-party-providers/:thirdPartyProviderId
 * METHOD: DELETE
 * Description: DELETE third party provider item
 */

router.delete('/:thirdPartyProviderId', (req, res) => {
  req.checkParams({
    thirdPartyProviderId: {
      notEmpty: true
    }
  });
  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: errors }).send();
  }
  const customerId = req.customerId;
  const thirdPartyProviderId = req.params.thirdPartyProviderId;

  const sqlQuery = {
    params: [
      customerId, thirdPartyProviderId
    ],
    raw: fs.readFileSync('sql/third-party-providers/delete-third-party-provider.sql').toString()
  };

  sql.query(sqlQuery.raw, sqlQuery.params)
    .then((data) => {
      const result = data.rows[0];
      res.json({ err: false, result }).send();
    })
    .catch((err) => {
      global.log.error('### sqlQuery ###');
      global.log.error(sqlQuery);
      global.log.error(err);
      res.json({ err: true, err_msg: 'DB_ERROR', result: err }).send();
    });
});


/**
 * URL: /v2/third-party-providers/:thirdPartyProviderId/countries
 * METHOD: GET
 * Description: GET third party provider attached countries
 */

router.get('/:thirdPartyProviderId/countries', (req, res) => {
  req.checkParams({
    thirdPartyProviderId: {
      notEmpty: true,
      isNumber: true
    }
  });
  req.checkQuery({
    offset: {
      notEmpty: true,
      isNumber: true
    }
  });
  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: 'VALIDATION_ERROR', result: errors }).send();
  }
  const customerId = req.customerId;
  const { thirdPartyProviderId } = req.params;
  const limit = 20;
  const offset = parseInt(req.query.offset, 10) * limit;


  const getProviderCountries = {
    countries(callback) {
      const sqlQuery = {
        params: [customerId, thirdPartyProviderId, limit, offset],
        raw: fs.readFileSync('sql/third-party-providers/get-third-party-provider-countries.sql').toString()
      };

      sql.query(sqlQuery.raw, sqlQuery.params)
        .then((data) => {
          const result = data.rows;
          callback(null, result);
        })
        .catch((err) => {
          global.log.error('### sqlQuery ###');
          global.log.error(sqlQuery);
          global.log.error(err);
          callback(err);
        });
    },
    availableCountries(callback) {
      const sqlQuery = {
        params: [customerId, thirdPartyProviderId],
        raw: fs.readFileSync('sql/third-party-providers/get-available-third-party-provider-countries.sql').toString()
      };
      sql.query(sqlQuery.raw, sqlQuery.params)
        .then((data) => {
          const result = data.rows[0];
          if (!result.countryIds) {
            return callback(null, []);
          }
          callback(null, result.countryIds);
        })
        .catch((err) => {
          global.log.error('### sqlQuery ###');
          global.log.error(sqlQuery);
          global.log.error(err);
          callback(err);
        });
    }
  };

  if (parseInt(req.query.offset, 10) !== 0) {
    delete getProviderCountries.availableCountries;
  }

  async.parallel(getProviderCountries, (err, result) => {
    if (err) {
      return res.json({ err: true, err_msg: 'DB_ERROR', result: err }).send();
    }
    res.json({ err: false, result }).send();
  });
});


/**
 * URL: /v2/third-party-providers/:thirdPartyProviderId/countries/:thirdPartyProviderCountryId
 * METHOD: DELETE
 * Description: DELETE third party provider attached country
 */

router.delete('/:thirdPartyProviderId/countries/:thirdPartyProviderCountryId', (req, res) => {
  req.checkParams({
    thirdPartyProviderId: {
      notEmpty: true,
      isNumber: true
    },
    thirdPartyProviderCountryId: {
      notEmpty: true,
      isNumber: true
    },
  });
  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: 'VALIDATION_ERROR', result: errors }).send();
  }
  const customerId = req.customerId;
  const { thirdPartyProviderId, thirdPartyProviderCountryId } = req.params;

  const sqlQuery = {
    params: [customerId, thirdPartyProviderId, thirdPartyProviderCountryId],
    raw: fs.readFileSync('sql/third-party-providers/delete-third-party-provider-country.sql').toString()
  };
  sql.query(sqlQuery.raw, sqlQuery.params)
    .then((data) => {
      res.json({ err: false, result: { deleted: !!data.rowCount } }).send();
    })
    .catch((err) => {
      global.log.error('### sqlQuery ###');
      global.log.error(sqlQuery);
      global.log.error(err);
      res.json({ err: true, err_msg: 'DB_ERROR', result: err }).send();
    });
});


/**
 * URL: /v2/third-party-providers/:thirdPartyProviderId/countries
 * METHOD: POST
 * Description: create third party provider country
 */

router.post('/:thirdPartyProviderId/countries', (req, res) => {
  req.checkParams({
    thirdPartyProviderId: {
      notEmpty: true,
      isNumber: true
    }
  });
  req.checkBody({
    countryIds: {
      notEmpty: true,
      isArray: true
    }
  });
  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: 'VALIDATION_ERROR', result: errors }).send();
  }
  const customerId = req.customerId;
  const { thirdPartyProviderId } = req.params;
  const { countryIds } = req.body;

  const sqlQuery = {
    params: [customerId, thirdPartyProviderId, JSON.stringify(countryIds)],
    raw: fs.readFileSync('sql/third-party-providers/create-third-party-provider-countries.sql').toString()
  };

  sql.query(sqlQuery.raw, sqlQuery.params)
    .then((data) => {
      const result = data.rows;
      res.json({ err: false, result }).send();
    })
    .catch((err) => {
      global.log.error('### sqlQuery ###');
      global.log.error(sqlQuery);
      global.log.error(err);
      res.json({ err: true, err_msg: 'DB_ERROR', result: err }).send();
    });
});


module.exports = router;
