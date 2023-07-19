const express = require('express');
const config = require('config');
const redis = require('redis').createClient(config.get('redis'));
const rimraf = require('rimraf');
const async = require('async');

const processImages = require('../../../services/sticker/process-images');
const formidable = require('formidable');
const s3 = require('s3');
const stickerService = require('../../../services/stickers');
const awsService = require('../../../services/aws');
const helpers = require('../../../helpers');


const router = express.Router();

router.use('/categories', require('./categories'));
router.use('/statuses', require('./statuses'));


/**
 * URL: /v1/stickers
 * METHOD: POST
 * Description: Upload and process sticker files
 */
// let incomingCall = true;
// router.post('/', (req, res) => {
//   const form = new formidable.IncomingForm();
//
//   if (!incomingCall) {
//     return res.status(200).json({ err: true, err_msg: 'PLEASE_WAIT_FOR_PREPARING' }).send();
//   }
//   form.parse(req, (err, attributes, files) => {
//     if (err) {
//       console.error(err);
//       return res.status(200)
//         .json({ err: true, err_msg: 'FORM_DATA_PARSING_ERROR', result: err }).send();
//     }
//     incomingCall = false;
//     const configuration = stickerService.validate(attributes, files);
//     global.async.series({
//       ios(callback) {
//         processImages.uploadAndroid(configuration, files)
//           .then((result) => {
//             callback(null, result);
//           })
//           .catch((err) => {
//             global.log.error('ios sticker upload error');
//             global.log.error(err);
//             callback(err, null);
//           });
//       },
//       android(callback) {
//         processImages.uploadIOS(configuration, files)
//           .then((result) => {
//             callback(null, result);
//           })
//           .catch((err) => {
//             global.log.error('android sticker upload error');
//             global.log.error(err);
//             callback(err, null);
//           });
//       }
//     }, (err, processResult) => {
//       if (err) {
//         global.log.error(err);
//         incomingCall = true;
//         return res.json({ err: true, err_msg: 'STICKER_FILE_PROCESS_ERROR' }).send();
//       }
//       const packageName = processResult.ios;
//       const prefix = req.administrator.customer.prefix;
//       const awsAccess = config.get(`app.aws.${prefix}`);
//
//       global.async.series({
//         iosUploader(callback) {
//           const uploader = s3.createClient({
//             maxAsyncS3: 20,
//             s3RetryCount: 3,
//             s3RetryDelay: 1000,
//             multipartUploadThreshold: 209715200,
//             multipartUploadSize: 157286400,
//             s3Options: {
//               accessKeyId: awsAccess.key,
//               secretAccessKey: awsAccess.secret
//             },
//           });
//           const s3Params = {
//             Bucket: 'sticker-packages',
//             Prefix: 'ios/'
//           };
//           const iosParams = {
//             localDir: `./uploads/${packageName}_IOS`,
//             deleteRemoved: true,
//             s3Params
//           };
//           const iosUploader = uploader.uploadDir(iosParams);
//           iosUploader.on('error', (err) => {
//             console.error('ios unable to sync:', err.stack);
//             callback({ err: true, err_msg: err }, null);
//           });
//           iosUploader.on('progress', () => {
//             console.log(`ios progress ${iosUploader.progressAmount}/${iosUploader.progressTotal}`);
//           });
//           iosUploader.on('end', () => {
//             console.log('ios upload finished');
//             callback(null, { config: { s3Params } });
//           });
//         },
//         androidUploader(callback) {
//           const uploader = s3.createClient({
//             maxAsyncS3: 20,
//             s3RetryCount: 3,
//             s3RetryDelay: 1000,
//             multipartUploadThreshold: 209715200,
//             multipartUploadSize: 157286400,
//             s3Options: {
//               accessKeyId: awsAccess.key,
//               secretAccessKey: awsAccess.secret
//             },
//           });
//           const s3Params = {
//             Bucket: 'sticker-packages',
//             Prefix: 'android/'
//           };
//           const androidParams = {
//             localDir: `./uploads/${packageName}`,
//             deleteRemoved: true,
//             s3Params,
//           };
//           const androidUploader = uploader.uploadDir(androidParams);
//           androidUploader.on('error', (err) => {
//             console.error('android unable to sync:', err.stack);
//             callback({ err: true, err_msg: err }, null);
//           });
//           androidUploader.on('progress', () => {
//             console.log(`android progress
//              ${androidUploader.progressAmount}/${androidUploader.progressTotal}`);
//           });
//           androidUploader.on('end', () => {
//             console.log('android upload finished');
//             callback(null, { config: { s3Params } });
//           });
//         }
//       }, (err, uploadResult) => {
//         if (err) {
//           global.log.error(err);
//           incomingCall = true;
//           return res.json({ err: true, err_msg: 'STICKER_UPLOAD_ERROR' }).send();
//         }
//         rimraf('uploads', (err) => {
//           if (err) {
//             global.log.error(err);
//           }
//         });
//         const packageConfig = JSON.stringify(uploadResult);
//         const customerId = req.customerId;
//         return res.json({ err: false, result: { packageConfig, customerId } }).send();
//       });
//     });
//   });
// });


/**
 * URL: /v1/stickers
 * METHOD: POST
 * Description: Create sticker
 */
router.post('/', (req, res) => {
  req.checkBody({
    name: {
      notEmpty: true
    },
    note: {
      notEmpty: true
    },
    orderNumber: {
      notEmpty: true,
      isNumber: true
    },
    copyright: {
      notEmpty: true
    },
  });

  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: false, err_msg: errors }).send();
  }
  const customerId = req.customerId;
  const name = req.body.name;
  const note = req.body.note;
  const orderNumber = req.body.orderNumber;
  const copyright = req.body.copyright;

  global.sql.first('create-sticker', [customerId, name, note, orderNumber, copyright], (err, sticker) => {
    if (err) {
      global.log.error(err);
      return res.status(200).json({ err: true, err_msg: 'DB_SET_ERROR', result: err }).send();
    }
    return res.status(200).json({ err: false, result: sticker }).send();
  });
});


/**
 * URL: /v1/stickers/:sticker_id/upload
 * METHOD: POST
 * Description: Upload sticker
 */
router.post('/:sticker_id/upload', (req, res) => {
  req.checkParams({
    sticker_id: {
      notEmpty: true,
      isNumber: true
    }
  });
  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: errors }).send();
  }
  const customerId = req.customerId;
  const packageId = req.params.sticker_id;

  global.sql.first('get-sticker-by-id', [customerId, packageId], (err, sticker) => {
    if (err) {
      return res.status(200).json({ err: true, err_msg: 'SERVER_ERROR' }).send();
    }
    if (!sticker) {
      return res.status(200).json({ err: true, err_msg: 'NOT_FOUND' }).send();
    }
    const form = new formidable.IncomingForm();
    form.parse(req, (err, fields, files) => {
      if (err) {
        return res.status(200).json({ err: true, err_msg: 'FORM_DATA_ERROR' }).send();
      }
      if (!stickerService.validateFiles(files)) {
        return res.status(200).json({ err: true, err_msg: 'MISSING_PARAMETERS' }).send();
      }
      const coordinates = fields.config || null;
      if (!coordinates) {
        return res.status(200).json({ err: true, err_msg: 'INVALID_COORDINATES' }).send();
      }
      global.sql.first('attach-sticker-coordinates', [customerId, packageId, coordinates], (err) => {
        if (err) {
          return res.status(200).json({ err: true, err_msg: 'SERVER_ERROR' }).send();
        }
        const prefix = req.administrator.customer.prefix;
        const awsAccess = config.get(`app.aws.${helpers.getConfigKey(prefix)}`);
        const stickerWorkingDir = `stickers/${packageId}`;

        async.forEachOf(files, (value, key, callback) => {
          awsService
            .uploadS3File
            .call({ prefix, awsAccess, contentType: 'image/png' }, value, stickerWorkingDir, (err) => {
              if (err) {
                return callback(err);
              }
              callback();
            });
        }, (err) => {
          if (err) {
            return res.status(200).json({ err: true, err_msg: 'UPLOADER_ERROR', result: err }).send();
          }
          return res.status(200).json({ err: false, result: 'UPLOAD_SUCCESS' }).send();
        });
      });
    });
  });
});


/**
 * URL: /v1/stickers/:sticker_id/upload
 * METHOD: GET
 * Description: Get sticker uploaded files
 */
router.get('/:sticker_id/upload', (req, res) => {
  req.checkParams({
    sticker_id: {
      notEmpty: true,
      isNumber: true
    }
  });
  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: errors }).send();
  }
  const customerId = req.customerId;
  const packageId = req.params.sticker_id;
  const prefix = req.administrator.customer.prefix;

  global.sql.first('get-sticker-by-id', [customerId, packageId], (err, sticker) => {
    console.log(err);
    console.log(sticker);
    if (err) {
      return res.status(200).json({ err: true, err_msg: 'SERVER_ERROR' }).send();
    }
    if (!sticker) {
      return res.status(200).json({ err: true, err_msg: 'NOT_FOUND' }).send();
    }
    const stickerWorkingDir = `stickers/${packageId}`;

    const signedUrls = stickerService.normalizeFileNames(sticker.coords).map(fileName => ({
      file: `${fileName}.png`,
      url: awsService.generateSignedUrl.call({ prefix }, `${stickerWorkingDir}/${fileName}.png`)
    }));
    return res.status(200).json({ err: false, result: signedUrls }).send();
  });
});

/**
 * URL: /v1/stickers/:sticker_id
 * METHOD: GET
 * Description: get All stickers
 */
router.put('/:sticker_id', (req, res) => {
  req.checkParams({
    sticker_id: {
      notEmpty: true,
      isNumber: true
    }
  });
  req.checkBody({
    name: {
      notEmpty: true
    },
    note: {
      notEmpty: true
    },
    copyright: {
      notEmpty: true
    },
    orderNumber: {
      notEmpty: true,
      isNumber: true
    }
  });
  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: errors }).send();
  }

  const customerId = req.customerId;
  const packageId = req.params.sticker_id;
  const name = req.body.name;
  const note = req.body.note;
  const copyright = req.body.copyright;
  const orderNumber = req.body.orderNumber;

  global.sql.first('update-sticker-by-id', [customerId, packageId, name, note, copyright, orderNumber], (err, sticker) => {
    if (err) {
      return res.status(200).json({ err: true, err_msg: 'SERVER_ERROR' }).send();
    }
    return res.status(200).json({ err: false, result: sticker }).send();
  });
});


/**
 * URL: /v1/stickers
 * METHOD: GET
 * Description: get All stickers
 */
router.get('/', (req, res) => {
  req.checkQuery({
    offset: {
      notEmpty: true,
      isNumber: true
    }
  });
  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: errors }).send();
  }

  const limit = 50;
  const offset = (req.query.offset) * limit;
  const customerId = req.customerId;


  global.sql.run('stickers', [customerId, limit, offset], (err, stickers) => {
    if (err) {
      return res.status(200).json({ err: true, err_msg: 'SERVER_ERROR' }).send();
    }
    return res.status(200).json({ err: false, result: stickers }).send();
  });
});


/**
 * URL: /v1/stickers/:sticker_id
 * METHOD: GET
 * Description: get All stickers
 */
router.get('/:sticker_id', (req, res) => {
  req.checkParams({
    sticker_id: {
      notEmpty: true,
      isNumber: true
    }
  });
  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: errors }).send();
  }

  const customerId = req.customerId;
  const packageId = req.params.sticker_id;

  global.sql.first('get-sticker-by-id', [customerId, packageId], (err, sticker) => {
    if (err) {
      return res.status(200).json({ err: true, err_msg: 'SERVER_ERROR' }).send();
    }
    return res.status(200).json({ err: false, result: sticker }).send();
  });
});


/**
 * URL: /v1/stickers/:sticker_id/:language_id/languages
 * METHOD: POST
 * Description: create sticker language
 */
router.post('/:sticker_id/:language_id/languages', (req, res) => {
  req.checkParams({
    sticker_id: {
      notEmpty: true,
      isNumber: true
    },
    language_id: {
      notEmpty: true,
      isNumber: true
    }
  });
  req.checkBody({
    title: {
      notEmpty: true
    },
    description: {
      notEmpty: true
    },
    introduction: {
      notEmpty: true
    },
    tags: {
      notEmpty: true
    }
  });
  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: errors }).send();
  }

  const customerId = req.customerId;
  const packageId = req.params.sticker_id;
  const languageId = req.params.language_id;
  const title = req.body.title;
  const introduction = req.body.introduction;
  const description = req.body.description;
  const tags = req.body.tags;

  const sql = {
    params: [customerId, packageId, languageId, title, introduction, description, tags]
  };

  global.sql.first('create-sticker-language', sql.params, (err, sticker) => {
    if (err) {
      global.log.error(err)
      return res.status(200).json({ err: true, err_msg: 'SERVER_ERROR' }).send();
    }
    return res.status(200).json({ err: false, result: sticker }).send();
  });
});


/**
 * URL: /v1/stickers/:sticker_id/:language_id/languages/:sticker_language_id
 * METHOD: PUT
 * Description: update sticker language
 */
router.put('/:sticker_id/:language_id/languages', (req, res) => {
  req.checkParams({
    sticker_id: {
      notEmpty: true,
      isNumber: true
    },
    language_id: {
      notEmpty: true,
      isNumber: true
    }
  });
  req.checkBody({
    title: {
      notEmpty: true
    },
    description: {
      notEmpty: true
    },
    introduction: {
      notEmpty: true
    },
    tags: {
      notEmpty: true
    }
  });
  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: errors }).send();
  }

  const customerId = req.customerId;
  const packageId = req.params.sticker_id;
  const languageId = req.params.language_id;
  const title = req.body.title;
  const introduction = req.body.introduction;
  const description = req.body.description;
  const tags = req.body.tags;

  const sql = {
    params: [customerId, packageId, languageId, title, introduction, description, tags]
  };

  global.sql.first('update-sticker-language', sql.params, (err, sticker) => {
    if (err) {
      return res.status(200).json({ err: true, err_msg: 'SERVER_ERROR' }).send();
    }
    return res.status(200).json({ err: false, result: sticker }).send();
  });
});


/**
 * URL: /v1/stickers/:sticker_id/:language_id/languages
 * METHOD: GET
 * Description: get sticker languages or one language
 */
router.get('/:sticker_id/:language_id/languages', (req, res) => {
  req.checkParams({
    sticker_id: {
      notEmpty: true,
      isNumber: true
    },
    language_id: {
      notEmpty: true,
      isNumber: true
    }
  });
  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: errors }).send();
  }

  const customerId = req.customerId;
  const packageId = req.params.sticker_id;
  const languageId = req.params.language_id > 0 ? parseInt(req.params.language_id, 10) : null;

  const sql = {
    params: [customerId, packageId, languageId]
  };

  global.sql.run('get-sticker-languages', sql.params, (err, stickers) => {
    if (err) {
      return res.status(200).json({ err: true, err_msg: 'SERVER_ERROR' }).send();
    }
    if (languageId) {
      return res.status(200).json({ err: false, result: stickers[0] }).send();
    }
    return res.status(200).json({ err: false, result: stickers }).send();
  });
});


/**
 * URL: /v1/stickers/:sticker_id/:language_id/languages
 * METHOD: DELETE
 * Description: delete sticker language
 */
router.delete('/:sticker_id/:language_id/languages', (req, res) => {
  req.checkParams({
    sticker_id: {
      notEmpty: true,
      isNumber: true
    },
    language_id: {
      notEmpty: true,
      isNumber: true
    }
  });
  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: errors }).send();
  }

  const customerId = req.customerId;
  const packageId = req.params.sticker_id;
  const languageId = req.params.language_id;

  const sql = {
    params: [customerId, packageId, languageId]
  };

  global.sql.first('delete-sticker-language', sql.params, (err, result) => {
    if (err) {
      return res.status(200).json({ err: true, err_msg: 'SERVER_ERROR' }).send();
    }
    return res.status(200).json({ err: false, result }).send();
  });
});


/**
 * URL: /v1/stickers/:sticker_id/categories
 * METHOD: GET
 * Description: get sticker attached categories
 */
router.get('/:sticker_id/categories', (req, res) => {
  req.checkParams({
    sticker_id: {
      notEmpty: true,
      isNumber: true
    }
  });
  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: errors }).send();
  }

  const customerId = req.customerId;
  const packageId = req.params.sticker_id;

  const sql = {
    params: [customerId, packageId]
  };

  global.sql.run('get-sticker-attached-categories', sql.params, (err, result) => {
    if (err) {
      return res.status(200).json({ err: true, err_msg: 'SERVER_ERROR' }).send();
    }
    return res.status(200).json({ err: false, result }).send();
  });
});


/**
 * URL: /v1/stickers/:sticker_id/categories
 * METHOD: POST
 * Description: attach categories to sticker
 */
router.post('/:sticker_id/categories', (req, res) => {
  req.checkParams({
    sticker_id: {
      notEmpty: true,
      isNumber: true
    }
  });
  req.checkBody({
    category_ids: {
      notEmpty: true,
      isArray: true
    }
  });
  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: errors }).send();
  }

  const packageId = req.params.sticker_id;
  const categoryIds = req.body.category_ids;

  const sql = {
    params: [packageId, JSON.stringify(categoryIds)]
  };

  global.sql.run('attach-sticker-categories', sql.params, (err, result, query) => {
    if (err) {
      return res.status(200).json({ err: true, err_msg: 'SERVER_ERROR' }).send();
    }
    return res.status(200).json({ err: false, result: query.rows }).send();
  });
});


/**
 * URL: /v1/stickers/:sticker_id/categories/:package_category_id
 * METHOD: DELETE
 * Description: detach sticker category
 */
router.delete('/:sticker_id/categories/:package_category_id', (req, res) => {
  req.checkParams({
    sticker_id: {
      notEmpty: true,
      isNumber: true
    },
    package_category_id: {
      notEmpty: true,
      isNumber: true
    }
  });
  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: errors }).send();
  }

  const packageId = req.params.sticker_id;
  const packageCategoryId = req.params.package_category_id;

  const sql = {
    params: [packageId, packageCategoryId]
  };

  global.sql.run('detach-sticker-category', sql.params, (err, result, query) => {
    if (err) {
      return res.status(200).json({ err: true, err_msg: 'SERVER_ERROR' }).send();
    }
    if (query.rowCount === 0) {
      return res.status(200).json({ err: true, err_msg: 'INVALID_PARAMS' }).send();
    }
    return res.status(200).json({ err: false, result: query }).send();
  });
});


/**
 * URL: /v1/stickers/:sticker_id/countries
 * METHOD: POST
 * Description: attach countries to stickers
 */
router.post('/:sticker_id/countries', (req, res) => {
  req.checkParams({
    sticker_id: {
      notEmpty: true,
      isNumber: true
    }
  });
  req.checkBody({
    region_codes: {
      notEmpty: true,
      isArray: true
    }
  });
  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: errors }).send();
  }

  const packageId = req.params.sticker_id;
  const regionCodes = req.body.region_codes;

  const sql = {
    params: [packageId, JSON.stringify(regionCodes)]
  };

  global.sql.run('attach-sticker-countries', sql.params, (err, result, query) => {
    if (err) {
      return res.status(200).json({ err: true, err_msg: 'SERVER_ERROR' }).send();
    }
    return res.status(200).json({ err: false, result: query.rows }).send();
  });
});


/**
 * URL: /v1/stickers/:sticker_id/countries/:package_country_id
 * METHOD: DELETE
 * Description: detach sticker country
 */
router.delete('/:sticker_id/countries/:package_country_id', (req, res) => {
  req.checkParams({
    sticker_id: {
      notEmpty: true,
      isNumber: true
    },
    package_country_id: {
      notEmpty: true,
      isNumber: true
    }
  });
  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: errors }).send();
  }

  const customerId = req.customerId;
  const packageId = req.params.sticker_id;
  const packageCountryId = req.params.package_country_id;

  const sql = {
    params: [customerId, packageId, packageCountryId]
  };

  global.sql.run('detach-sticker-country', sql.params, (err, result, query) => {
    if (err) {
      return res.status(200).json({ err: true, err_msg: 'SERVER_ERROR' }).send();
    }
    if (query.rowCount === 0) {
      return res.status(200).json({ err: true, err_msg: 'INVALID_PARAMS' }).send();
    }

    return res.status(200).json({ err: false, result: query }).send();
  });
});


/**
 * URL: /v1/stickers/:sticker_id/countries
 * METHOD: GET
 * Description: get sticker attached countries
 */
router.get('/:sticker_id/countries', (req, res) => {
  req.checkParams({
    sticker_id: {
      notEmpty: true,
      isNumber: true
    }
  });
  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: errors }).send();
  }

  const customerId = req.customerId;
  const packageId = req.params.sticker_id;

  const sql = {
    params: [customerId, packageId]
  };

  global.sql.run('get-sticker-attached-countries', sql.params, (err, result) => {
    if (err) {
      return res.status(200).json({ err: true, err_msg: 'SERVER_ERROR' }).send();
    }
    return res.status(200).json({ err: false, result }).send();
  });
});


/**
 * URL: /v1/stickers/:sticker_id/statuses
 * METHOD: POST
 * Description: change sticker status
 */
router.post('/:sticker_id/statuses', (req, res) => {
  req.checkParams({
    sticker_id: {
      notEmpty: true,
      isNumber: true
    }
  });
  req.checkBody({
    status_id: {
      notEmpty: true,
      isNumber: true
    }
  });
  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: errors }).send();
  }

  const customerId = req.customerId;
  const packageId = req.params.sticker_id;
  const statusId = req.body.status_id;

  const sql = {
    params: [customerId, packageId, statusId]
  };

  global.sql.first('attach-sticker-status', sql.params, (err, result) => {
    if (err) {
      return res.status(200).json({ err: true, err_msg: 'SERVER_ERROR' }).send();
    }
    return res.status(200).json({ err: false, result }).send();
  });
});


/**
 * URL: /v1/stickers/:sticker_id/statuses
 * METHOD: GET
 * Description: get sticker status
 */
router.get('/:sticker_id/statuses', (req, res) => {
  req.checkParams({
    sticker_id: {
      notEmpty: true,
      isNumber: true
    }
  });
  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: errors }).send();
  }

  const customerId = req.customerId;
  const packageId = req.params.sticker_id;

  const sql = {
    params: [customerId, packageId]
  };

  global.sql.first('get-sticker-status', sql.params, (err, result) => {
    if (err) {
      return res.status(200).json({ err: true, err_msg: 'SERVER_ERROR' }).send();
    }
    return res.status(200).json({ err: false, result }).send();
  });
});


/**
 * URL: /v1/stickers/:sticker_id/platforms
 * METHOD: POST
 * Description: attach platforms to stickers
 */
router.post('/:sticker_id/platforms', (req, res) => {
  req.checkParams({
    sticker_id: {
      notEmpty: true,
      isNumber: true
    }
  });
  req.checkBody({
    platform_ids: {
      notEmpty: true,
      isArray: true
    }
  });
  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: errors }).send();
  }

  const packageId = req.params.sticker_id;
  const platformIds = req.body.platform_ids;

  const sql = {
    params: [packageId, JSON.stringify(platformIds)]
  };

  global.sql.run('attach-sticker-platforms', sql.params, (err, result, query) => {
    if (err) {
      return res.status(200).json({ err: true, err_msg: 'SERVER_ERROR' }).send();
    }
    return res.status(200).json({ err: false, result: query.rows }).send();
  });
});


/**
 * URL: /v1/stickers/:sticker_id/platforms/:package_platform_id
 * METHOD: DELETE
 * Description: detach sticker platforms
 */
router.delete('/:sticker_id/platforms/:package_platform_id', (req, res) => {
  req.checkParams({
    sticker_id: {
      notEmpty: true,
      isNumber: true
    },
    package_platform_id: {
      notEmpty: true,
      isNumber: true
    }
  });
  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: errors }).send();
  }

  const customerId = req.customerId;
  const packageId = req.params.sticker_id;
  const packagePlatformId = req.params.package_platform_id;

  const sql = {
    params: [customerId, packageId, packagePlatformId]
  };

  global.sql.run('detach-sticker-platform', sql.params, (err, result, query) => {
    if (err) {
      return res.status(200).json({ err: true, err_msg: 'SERVER_ERROR' }).send();
    }
    if (query.rowCount === 0) {
      return res.status(200).json({ err: true, err_msg: 'INVALID_PARAMS' }).send();
    }
    return res.status(200).json({ err: false, result: query }).send();
  });
});


/**
 * URL: /v1/stickers/:sticker_id/platforms
 * METHOD: GET
 * Description: get sticker attached platforms
 */
router.get('/:sticker_id/platforms', (req, res) => {
  req.checkParams({
    sticker_id: {
      notEmpty: true,
      isNumber: true
    }
  });
  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: errors }).send();
  }

  const customerId = req.customerId;
  const packageId = req.params.sticker_id;

  const sql = {
    params: [customerId, packageId]
  };

  global.sql.run('get-sticker-attached-platforms', sql.params, (err, result) => {
    if (err) {
      return res.status(200).json({ err: true, err_msg: 'SERVER_ERROR' }).send();
    }
    return res.status(200).json({ err: false, result }).send();
  });
});


/**
 * URL: /v1/stickers/:sticker_id
 * METHOD: DELETE
 * Description: Delete sticker package
 */
router.delete('/:sticker_id', (req, res) => {
  req.checkParams({
    sticker_id: {
      notEmpty: true,
      isNumber: true
    }
  });
  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: errors }).send();
  }
  const customerId = req.customerId;
  const packageId = parseInt(req.params.sticker_id, 10);

  global.sql.first('delete-sticker-by-id', [packageId, customerId], (err, result) => {
    console.log(err);
    if (err) {
      return res.status(200).json({ err: true, err_msg: 'SERVER_ERROR' }).send();
    }
    return res.status(200).json({ err: false, result }).send();
  });
});


/**
 * URL: /v1/stickers/:sticker_id/publish
 * METHOD: POST
 * Description: POST publish sticker package
 */
router.post('/:sticker_id/publish', (req, res) => {
  req.checkParams({
    sticker_id: {
      notEmpty: true,
      isNumber: true
    }
  });
  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: errors }).send();
  }
  const customerId = req.customerId;
  const packageId = parseInt(req.params.sticker_id, 10);
  const prefix = req.administrator.customer.prefix;

  global.sql.first('get-sticker-by-id', [customerId, packageId], (err, result) => {
    if (err) {
      return res.status(200).json({ err: true, err_msg: 'SERVER_ERROR' }).send();
    }
    stickerService.processPackagePublish(prefix, result, (err, output) => {
      if (err) {
        return res.status(200).json({ err: true, err_msg: err }).send();
      }
      return res.status(200).json({ err: false, result: output }).send();
    });
  });
});

/**
 * URL: /v1/stickers/:sticker_id/publish
 * METHOD: POST
 * Description: POST publish sticker package
 */
router.post('/:sticker_id/build', (req, res) => {
  req.checkParams({
    sticker_id: {
      notEmpty: true,
      isNumber: true
    }
  });
  const errors = req.validationErrors(true);
  if (errors) {
    return res.json({ err: true, err_msg: errors }).send();
  }
  const customerId = req.customerId;
  const packageId = parseInt(req.params.sticker_id, 10);
  const prefix = req.administrator.customer.prefix;

  global.sql.first('get-sticker-by-id', [customerId, packageId], (err, result) => {
    if (err) {
      return res.status(200).json({ err: true, err_msg: 'SERVER_ERROR' }).send();
    }

    stickerService.processPackageBuild(prefix, result, (err, output) => {
      if (err) {
        return res.status(200).json({ err: true, err_msg: err }).send();
      }
      return res.status(200).json({ err: false, result: output }).send();
    });
  });
});


module.exports = router;
