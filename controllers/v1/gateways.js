/* eslint-disable no-restricted-syntax */
const express = require('express');
const async = require('async');
const _ = require('lodash');
const request = require('request');
const config = require('config');
const fs = require('fs');
const formidable = require('formidable');
const xlsx = require('node-xlsx');

const { S3 } = require('../../helpers/constants');
const helpers = require('../../helpers');
const { uploadFile, generateSignedUrl } = require('../../services/aws');
const redisHelper = require('../../services/redis');
const logger = require('../../services/logger');
const gatewayService = require('../../services/gateway');
const gatewayServiceV2 = require('../../services/gatewayV2');

const redis = require('redis').createClient(config.get('redis'));


const router = express.Router();


/**
 * URL: /v1/gateways/health
 * METHOD: GET
 * Description: Health check for gateway
 */

router.get('/health', async (req, res) => {
  req.checkQuery({
    host: {
      notEmpty: true,
      isString: true
    },
    username: {
      optional: true,
      isString: true
    },
    password: {
      optional: true,
      isString: true
    },
    dialPrefix: {
      optional: true,
      isString: true
    },
    callee: {
      notEmpty: true,
      isString: true
    }
  });

  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: 'VALIDATION_ERROR', result: errors });
  }

  const host = req.query.host;
  const username = req.query.username || '';
  const password = req.query.password || '';
  const callee = req.query.callee || '';
  const dialPrefix = req.query.dialPrefix || '';

  try {
    const result = await gatewayService.healthCheck({
      host, username, password, callee, dialPrefix
    });
    res.json({ err: false, result });
  } catch (e) {
    logger.error(e);
    res.json({ err: true, err_msg: e.message });
  }
});


/**
 * URL: /v1/gateways
 * METHOD: GET
 * Description: GET gateways
 */

router.get('/', (req, res) => {
  req.checkQuery({
    virtualNetwork: {
      optional: true
    },
  });
  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: errors });
  }


  const prefix = req.administrator.customer.prefix;
  const virtualNetwork = req.network.name || '';
  const billingConf = config.get(`billing.${helpers.getConfigKey(prefix)}`);

  const requestUrl = `${billingConf.host}/jbilling/rest/gateway/getGateways`;
  const queryString = {
    prefix,
    reseller: virtualNetwork,
  };

  request.get(requestUrl, {
    qs: queryString
  }, (err, httpResponse, result) => {
    if (err || result.error) {
      global.log.error(err || result.error);
      return res.status(200).json({ err: false, err_msg: 'NETWORK_BILLING_SERVICE_ERROR' }).send();
    }
    let gateways;
    try {
      gateways = JSON.parse(result);
    } catch (e) {
      global.log.error(e);
      global.log.error(result);
      return res.status(200).json({ err: false, err_msg: 'BILLING_SERVICE_ERROR' }).send();
    }
    return res.status(200).json({ err: false, result: gateways.result }).send();
  });
});


/**
 * URL: /v1/gateways/:gateway_id
 * METHOD: GET
 * Description: GET gateway details by ID
 */

router.get('/:gateway_id', (req, res) => {
  req.checkParams({
    gateway_id: {
      notEmpty: true,
      isNumber: true
    }
  });
  req.checkQuery({
    virtualNetwork: {
      optional: true
    },
  });

  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: errors }).send();
  }

  const virtualNetwork = req.network.name || '';
  const gatewayId = parseInt(req.params.gateway_id, 10);

  const prefix = req.administrator.customer.prefix;

  const billingConf = config.get(`billing.${helpers.getConfigKey(prefix)}`);

  const requestUrl = `${billingConf.host}/jbilling/rest/gateway/getGateway`;
  const queryString = {
    prefix,
    reseller: virtualNetwork,
    id: gatewayId
  };

  request.get(requestUrl, {
    qs: queryString
  }, (err, httpResponse, result) => {
    if (err || result.error) {
      global.log.error(err || result.err);
      return res.status(200).json({ err: false, err_msg: 'NETWORK_BILLING_SERVICE_ERROR' }).send();
    }
    let gateway;
    try {
      gateway = JSON.parse(result);
    } catch (e) {
      global.log.error(e);
      global.log.error(result);
      return res.json({ err: false, err_msg: 'BILLING_SERVICE_ERROR' });
    }
    const fileName = `${S3.PREFIX.GATEWAY}/gateway#${gatewayId}#pricelist.csv`;
    const file = generateSignedUrl.call({ prefix }, fileName);
    return res.json({ err: false, result: { ...gateway.result, file } });
  });
});


/**
 * URL: /v1/gateways
 * METHOD: POST
 * Description: Create gateway
 */

router.post('/', (req, res) => {
  req.checkBody({
    host: {
      notEmpty: true,
    },
    description: {
      notEmpty: true,
    },
    param1: {
      notEmpty: true,
      isFloatNumber: true
    },
    param2: {
      notEmpty: true,
      isFloatNumber: true
    },
    dialPrefix: {
      optional: true,
    },
    active: {
      notEmpty: true,
      isBoolean: true
    },
    virtualNetwork: {
      optional: true
    },
    countries: {
      notEmpty: true,
      isArray: true
    },
    username: {
      optional: true
    },
    password: {
      optional: true
    }
  });

  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: errors }).send();
  }


  const prefix = req.administrator.customer.prefix;

  const billingConf = config.get(`billing.${helpers.getConfigKey(prefix)}`);
  const requestUrl = `${billingConf.host}/jbilling/rest/gateway/addNewGateway`;
  const virtualNetwork = req.network.name || '';


  const queryString = {
    id: 0,
    host: req.body.host,
    description: req.body.description,
    active: req.body.active,
    main: req.body.main || false,
    prefix: req.administrator.customer.prefix,
    reseller: virtualNetwork,
    countries: req.body.countries.join(';'),
    username: req.body.username || '',
    password: req.body.password || '',
    type: 'MAIN',
    param1: req.body.param1,
    param2: req.body.param2,
    dialPrefix: req.body.dialPrefix || ''
  };
  logger.info(queryString);

  request.get(requestUrl, {
    qs: queryString
  }, (err, httpResponse, result) => {
    if (err || result.error) {
      global.log.error(err || result.err);
      return res.status(200).json({ err: true, err_msg: 'NETWORK_BILLING_SERVICE_ERROR' }).send();
    }
    let gateway;
    try {
      gateway = JSON.parse(result);
    } catch (e) {
      global.log.error(e);
      global.log.error(result);
      return res.status(200).json({ err: true, err_msg: 'BILLING_SERVICE_ERROR' }).send();
    }
    return res.status(200).json({ err: false, result: { gateway_id: gateway.result } }).send();
  });
});

/**
 * URL: /v1/gateways/:gateway_id
 * METHOD: PUT
 * Description: Update gateway gateway
 */

router.put('/:gateway_id', (req, res) => {
  req.checkParams({
    gateway_id: {
      notEmpty: true,
      isNumber: true
    }
  });
  req.checkBody({
    host: {
      notEmpty: true,
    },
    description: {
      notEmpty: true,
    },
    param1: {
      notEmpty: true,
      isFloatNumber: true
    },
    param2: {
      notEmpty: true,
      isFloatNumber: true
    },
    dialPrefix: {
      optional: true,
    },
    active: {
      notEmpty: true,
      isBoolean: true
    },
    virtualNetwork: {
      optional: true
    },
    countries: {
      notEmpty: true,
      isArray: true
    },
    username: {
      optional: true
    },
    password: {
      optional: true
    }
  });

  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: errors }).send();
  }

  const prefix = req.administrator.customer.prefix;

  const billingConf = config.get(`billing.${helpers.getConfigKey(prefix)}`);

  const requestUrl = `${billingConf.host}/jbilling/rest/gateway/addNewGateway`;
  const gatewayId = req.params.gateway_id;
  const virtualNetwork = req.network.name || '';

  const queryString = {
    id: gatewayId,
    host: req.body.host,
    description: req.body.description,
    active: req.body.active,
    main: req.body.main || false,
    prefix: req.administrator.customer.prefix,
    reseller: virtualNetwork,
    countries: req.body.countries.join(';'),
    username: req.body.username || '',
    password: req.body.password || '',
    type: 'MAIN',
    param1: parseFloat(req.body.param1),
    param2: parseFloat(req.body.param2),
    dialPrefix: req.body.dialPrefix || ''
  };
  logger.info(queryString);

  request.get(requestUrl, {
    qs: queryString
  }, (err, httpResponse, result) => {
    if (err || result.error) {
      global.log.error(err);
      return res.status(200).json({ err: true, err_msg: 'NETWORK_BILLING_SERVICE_ERROR' }).send();
    }
    let gateway;
    try {
      gateway = JSON.parse(result);
    } catch (e) {
      global.log.error(e);
      global.log.error(result);
      return res.status(200).json({ err: true, err_msg: 'BILLING_SERVICE_ERROR' }).send();
    }
    return res.status(200).json({ err: false, result: { gateway_id: gateway.result } }).send();
  });
});


/**
 * URL: /v1/gateways/:gateway_id
 * METHOD: DELETE
 * Description: DELETE gateway
 */

router.delete('/:gatewayId', (req, res) => {
  req.checkParams({
    gatewayId: {
      notEmpty: true,
      isNumber: true
    }
  });
  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: errors }).send();
  }


  const prefix = req.administrator.customer.prefix;
  const billingConf = config.get(`billing.${helpers.getConfigKey(prefix)}`);
  const gatewayId = req.params.gatewayId;

  const requestUrl = `${billingConf.host}/jbilling/rest/gateway/deleteGateway`;
  const queryString = {
    id: gatewayId
  };

  request.get(requestUrl, {
    qs: queryString
  }, (err, httpResponse, result) => {
    if (err) {
      global.log.error(err);
      return res.status(200).json({ err: true, err_msg: 'NETWORK_BILLING_SERVICE_ERROR' }).send();
    }


    let deleted;
    try {
      deleted = JSON.parse(result);
    } catch (e) {
      global.log.error(e);
      global.log.error(result);
      return res.status(200).json({ err: true, err_msg: 'BILLING_SERVICE_ERROR' }).send();
    }

    if (!deleted.result && deleted.error) {
      global.log.error(deleted.result);
      return res.status(200).json({ err: true, err_msg: 'NETWORK_BILLING_SERVICE_ERROR' }).send();
    }

    return res.status(200).json({ err: false, result: deleted.result }).send();
  });
});


/**
 * URL: /v1/gateways/:gatewayId/call-prices
 * METHOD: POST
 * Description: GET gateway call prices
 */

router.post('/:gateway_id/call-prices', (req, res) => {
  req.checkParams({
    gateway_id: {
      notEmpty: true,
      isNumber: true
    }
  });
  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: errors }).send();
  }

  const gatewayId = req.params.gateway_id;
  const prefix = req.administrator.customer.prefix;

  const form = formidable.IncomingForm({
    keepExtensions: true
  });

  form.parse(req, (err, attributes, files) => {
    if (err) {
      return res.json({ err: true, err_msg: 'UPLOAD_ERROR' });
    }

    const priceList = files.pricelist;
    const fileName = `gateway#${gatewayId}#pricelist.csv`;
    const to = `${S3.PREFIX.GATEWAY}/${fileName}`;

    fs.readFile(priceList.path, (err, buffer) => {
      if (err) {
        global.log.error(err);
        return res.json({ err: true, err_msg: 'FILE_READ_ERROR' });
      }
      uploadFile.call({ prefix }, buffer, to, (err) => {
        if (err) {
          return res.json({ err: true, err_msg: 'S3_UPLOAD_ERROR' }).send();
        }
        const parsedXLSX = xlsx.parse(buffer);
        let countryPrices = [];

        for (const price of parsedXLSX[0].data) {
          if (price.length > 0 && !!price) {
            try {
              if (
                price[0] &&
                  (_.isNumber(price[0]) || price[0].toString().includes('#'))
                    && price[1]
                    && price[2] !== null
                    && price[3]
                    && price[4]
              ) {
                countryPrices.push([price[0], price[1], price[2], price[3], price[4]]);
              } else {
                throw new Error('NOT_VALIDATED_PRICE_ROW');
              }
            } catch (e) {
              global.log.error('INVALID_PRICE_ROW');
              global.log.error(e);
              global.log.error(price);
            }
          }
        }
        if (countryPrices.length === 0) {
          return res.json({ err: true, err_msg: 'EMPTY_PRICE_LIST' });
        }

        const prefix = req.administrator.customer.prefix;

        const billingConf = config.get(`billing.${helpers.getConfigKey(prefix)}`);

        const requestUrl = `${billingConf.host}/jbilling/rest/gateway/setPriceList`;

        const countryPricesChunk = _.chunk(countryPrices, 1000);
        const checkData = countryPrices[0];
        countryPrices = null;

        async.waterfall([
          (callback) => {
            global.log.info('START');
            const data = {
              gateway: gatewayId,
              prices: JSON.stringify([checkData]),
              phase: 'START',
            };
            request.post(requestUrl, {
              form: data
            }, (err, httpResponse, result) => {
              if (err) {
                global.log.error(err);
                return callback(result);
              }
              try {
                JSON.parse(result);
              } catch (e) {
                global.log.error(e);
                global.log.error(result);
                return callback(result);
              }
              callback(null, true);
            });
          },
          (isStarted, callback) => {
            global.log.info('ADD');
            if (!isStarted) {
              return callback('NOT_STARTED');
            }

            async.each(countryPricesChunk, (chunk, eachCallback) => {
              const data = {
                gateway: gatewayId,
                prices: JSON.stringify(chunk),
                phase: 'ADD',
              };
              request.post(requestUrl, {
                form: data
              }, (err, httpResponse, result) => {
                if (err) {
                  global.log.error(err);
                  return eachCallback(result);
                }
                try {
                  JSON.parse(result);
                } catch (e) {
                  global.log.error(e);
                  global.log.error(result);
                  return eachCallback(result);
                }
                eachCallback();
              });
            }, (err) => {
              if (err) {
                return callback(err, null);
              }
              return callback(err, true);
            });
          },
          (isAdded, callback) => {
            global.log.info('END');
            if (!isAdded) {
              return callback('NOT_ADDED');
            }
            const data = {
              gateway: gatewayId,
              prices: JSON.stringify([checkData]),
              phase: 'END',
            };

            request.post(requestUrl, {
              form: data
            }, (err, httpResponse, result) => {
              if (err || result.error) {
                global.log.error(err || result.error);
                return callback(result);
              }
              try {
                JSON.parse(result);
              } catch (e) {
                global.log.error(e);
                global.log.error(result);
                return callback(result);
              }
              return callback(null, true);
            });
          }
        ], (err, result) => {
          if (err) {
            return res.json({ err: true, err_msg: 'CALL_PRICE_STORING_ERROR' });
          }
          if (!result) {
            return res.json({ err: true, result: 'INVALID_PRICE_LIST_FILE' });
          }
          return res.json({ err: false, result: 'SUCCESSFUL' });
        });
      });
    });
  });
});


/**
 * URL: /v1/gateways/:gatewayId/call-prices/cache
 * METHOD: Put
 * Description: Update rates from billing
 * */

router.put('/:gatewayId/call-prices/cache', async (req, res) => {
  req.checkBody({
    virtualNetworkId: {
      optional: true,
    }
  });
  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: errors }).send();
  }

  const customerId = req.customerId;
  const userGroupId = req.query.userGroupId;

  try {
    await gatewayServiceV2.gateways.cache.prices({
      customerId, userGroupId
    });

    res.json({ err: false, result: true });
  } catch (e) {
    logger.error(e);
    res.json({ err: true, err_msg: e || e.message });
  }
});


module.exports = router;
