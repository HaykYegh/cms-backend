/* eslint-disable no-restricted-syntax,no-prototype-builtins */
const rimraf = require('rimraf');
const path = require('path');
const awsService = require('../services/aws');
const config = require('config');
const async = require('async');
const s3 = require('s3');
const processImages = require('../services/sticker/process-images');
const helpers = require('../helpers');


const stickerFileNames = ['icon', 'unavailable_icon', 'avatar', 'preview', 'banner'];

const validateFiles = files => stickerFileNames.every(property => files.hasOwnProperty(property));
const normalizeCoordinates = (coordinates, asNames = false) =>
  ((!asNames) ? coordinates.map((box, index) => {
    const boxName = Object.keys(box)[0];
    return {
      [boxName]: box[boxName].map((sticker) => {
        sticker.startY = (sticker.startY - (4 * index)).toString();
        return sticker;
      })
    };
  }) : [].concat(...coordinates.map((box) => {
    const boxName = Object.keys(box)[0];
    return box[boxName].map(sticker => sticker.name);
  })));

const normalizeFileNames = coordinates =>
  [].concat(stickerFileNames, normalizeCoordinates(coordinates, true));


const getAssetFiles = (prefix, { packageId, coordinates }, callback) => {
  const assetsFunctions = {};

  const fileNames = normalizeFileNames(coordinates, true); // eslint-disable-next-line guard-for-in
  for (const fileName of fileNames) {
    assetsFunctions[fileName] = (callback) => {
      awsService.getObject.call({ prefix }, null, `stickers/${packageId}/${fileName}.png`, (err, data) => {
        console.log(data);
        if (!err) {
          callback(null, data);
        } else {
          callback('GET_OBJECT_ERROR', data);
        }
      });
    };
  }
  async.parallel(assetsFunctions, (err, result) => {
    if (err) {
      callback(err, null);
    } else {
      callback(null, result);
    }
  });
};

const buildPackages = ({ packageNumber }, configuration, files, callback) => {
  rimraf(`uploads/${packageNumber}`, () => {
    async.series({
      ios(callback) {
        processImages.uploadIOS(configuration, packageNumber, files)
          .then((result) => {
            callback(null, result);
          })
          .catch((err) => {
            global.log.error('ios sticker upload error');
            global.log.error(err);
            callback(err, null);
          });
      },
      android(callback) {
        processImages.uploadAndroid(configuration, packageNumber, files)
          .then((result) => {
            callback(null, result);
          })
          .catch((err) => {
            global.log.error('android sticker upload error');
            global.log.error(err);
            callback(err, null);
          });
      }
    }, (err) => {
      if (err) {
        global.log.error(err);
        return callback(err, null);
      }
      return callback(null, 'STICKER_FILE_PROCESS_SUCCESSFUL');
    });
  });
};

const processPackageBuild = (prefix, packageModel, callback) => {
  getAssetFiles(prefix, {
    packageId: packageModel.package_id,
    packageNumber: packageModel.package_number,
    coordinates: packageModel.coords
  },
  (err, assets) => {
    if (err) {
      callback(err, null);
    } else {
      let incorrectFiles = false;
      const fileNames = normalizeFileNames(packageModel.coords, true);

      for (const fileName of fileNames) {
        if (!assets[fileName]) {
          incorrectFiles = true;
        }
      }
      if (incorrectFiles) {
        return callback('INVALID_FILES', null);
      }

      buildPackages({
        prefix,
        packageNumber: packageModel.package_number
      }, packageModel.coords, assets, (err, status) => {
        if (err) {
          return callback(err, null);
        }
        callback(null, status);
      });
    }
  });
};

const publishPackages = ({ prefix, packageNumber }, callback) => {
  const awsAccess = config.get(`app.aws.${helpers.getConfigKey(prefix)}`);

  global.async.series({
    iosUploader(callback) {
      const uploader = s3.createClient({
        maxAsyncS3: 20,
        s3RetryCount: 3,
        s3RetryDelay: 1000,
        multipartUploadThreshold: 209715200,
        multipartUploadSize: 157286400,
        s3Options: {
          accessKeyId: `${awsAccess.key}`,
          secretAccessKey: `${awsAccess.secret}`
        },
      });

      let bucket = `${prefix}-sticker-packages`;

      if (prefix === 'zz') {
        bucket = 'zangistickersnew';
      }


      const s3Params = {
        Bucket: bucket,
        Prefix: `ios/${packageNumber}`
      };

      console.log(s3Params);

      const iosParams = {
        localDir: `./uploads/${packageNumber}_IOS`,
        s3Params
      };
      const iosUploader = uploader.uploadDir(iosParams);
      iosUploader.on('error', (err) => {
        console.error('ios unable to sync:', err.stack);
        callback(err.stack, null);
      });
      iosUploader.on('progress', () => {
        console.log(`ios progress ${iosUploader.progressAmount}/${iosUploader.progressTotal}`);
      });
      iosUploader.on('end', () => {
        console.log('ios upload finished');
        callback(null, {
          s3: {
            bucket: s3Params.Bucket,
            prefix: s3Params.Prefix,
          }
        });
      });
    },
    androidUploader(callback) {
      const uploader = s3.createClient({
        maxAsyncS3: 20,
        s3RetryCount: 3,
        s3RetryDelay: 1000,
        multipartUploadThreshold: 209715200,
        multipartUploadSize: 157286400,
        s3Options: {
          accessKeyId: awsAccess.key,
          secretAccessKey: awsAccess.secret
        },
      });


      let bucket = `${prefix}-sticker-packages`;

      if (prefix === 'zz') {
        bucket = 'zangistickersnew';
      }


      const s3Params = {
        Bucket: bucket,
        Prefix: `android/${packageNumber}`
      };
      const androidParams = {
        localDir: path.join(`./uploads/${packageNumber}`),
        s3Params,
      };
      const androidUploader = uploader.uploadDir(androidParams);
      androidUploader.on('error', (err) => {
        console.error('android unable to sync:', err.stack);
        callback(err.stack, null);
      });
      androidUploader.on('progress', () => {
        // console.log(`android progress
        //  ${androidUploader.progressAmount}/${androidUploader.progressTotal}`);
      });
      androidUploader.on('end', () => {
        console.log('android upload finished');


        callback(null, {
          s3: {
            bucket: s3Params.Bucket,
            prefix: s3Params.Prefix,
          }
        });
      });
    },


    iosUploaderPinngle(callback) {
      const uploader = s3.createClient({
        maxAsyncS3: 20,
        s3RetryCount: 3,
        s3RetryDelay: 1000,
        multipartUploadThreshold: 209715200,
        multipartUploadSize: 157286400,
        s3Options: {
          accessKeyId: 'AKIAJ36DURJOSMHFDJLQ',
          secretAccessKey: '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'
        },
      });
      const s3Params = {
        Bucket: 'whitel',
        Prefix: `pinngle/pinnglestickers/ios/${packageNumber}`
      };

      console.log(s3Params);

      const iosParams = {
        localDir: `./uploads/${packageNumber}_IOS`,
        s3Params
      };
      const iosUploader = uploader.uploadDir(iosParams);
      iosUploader.on('error', (err) => {
        console.error('ios unable to sync:', err.stack);
        callback(err.stack, null);
      });
      iosUploader.on('progress', () => {
        console.log(`ios progress ${iosUploader.progressAmount}/${iosUploader.progressTotal}`);
      });
      iosUploader.on('end', () => {
        console.log('ios upload finished');
        callback(null, {
          s3: {
            bucket: s3Params.Bucket,
            prefix: s3Params.Prefix,
          }
        });
      });
    },
    androidUploaderPinngle(callback) {
      const uploader = s3.createClient({
        maxAsyncS3: 20,
        s3RetryCount: 3,
        s3RetryDelay: 1000,
        multipartUploadThreshold: 209715200,
        multipartUploadSize: 157286400,
        s3Options: {
          accessKeyId: 'AKIAJ36DURJOSMHFDJLQ',
          secretAccessKey: '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'
        },
      });
      const s3Params = {
        Bucket: 'whitel',
        Prefix: `pinngle/pinnglestickers/android/${packageNumber}`
      };
      const androidParams = {
        localDir: path.join(`./uploads/${packageNumber}`),
        s3Params,
      };
      const androidUploader = uploader.uploadDir(androidParams);
      androidUploader.on('error', (err) => {
        console.error('android unable to sync:', err.stack);
        callback(err.stack, null);
      });
      androidUploader.on('progress', () => {
        // console.log(`android progress
        //  ${androidUploader.progressAmount}/${androidUploader.progressTotal}`);
      });
      androidUploader.on('end', () => {
        console.log('android upload finished');


        callback(null, {
          s3: {
            bucket: s3Params.Bucket,
            prefix: s3Params.Prefix,
          }
        });
      });
    }


  }, (err, uploadResult) => {
    if (err) {
      global.log.error(err);
      return callback(err, null);
    }

    async.series({
      deleteAndroid(callback) {
        rimraf(`uploads/${packageNumber}`, (err) => {
          if (err) {
            global.log.error(err);
          }
          callback(null, 'ANDROID_DELETED');
        });
      },
      deleteIOS(callback) {
        rimraf(`uploads/${packageNumber}_IOS`, (err) => {
          if (err) {
            global.log.error(err);
          }
          callback(null, 'IOS_DELETED');
        });
      }
    }, () => callback(null, {
      ios: uploadResult.iosUploader,
      android: uploadResult.androidUploader,
    }));
  });
};
const processPackagePublish = (prefix, packageModel, callback) => {
  publishPackages({
    prefix,
    packageNumber: packageModel.package_number
  }, (err, config) => {
    if (err) {
      return callback(err, null);
    }

    const sqlQuery = {
      raw: 'update-sticker-config',
      params: [packageModel.customer_id, packageModel.package_id, JSON.stringify(config)]
    };


    console.log(sqlQuery);


    global.sql.first(sqlQuery.raw, sqlQuery.params, (err, stickerPackage) => {
      if (err) {
        return callback('UNABLE_UPDATE_STICKER_CONFIG', null);
      }
      callback(null, stickerPackage);
    });
  });
};


module.exports = {
  validateFiles,
  stickerFileNames,
  normalizeFileNames,
  processPackageBuild,
  processPackagePublish
};

