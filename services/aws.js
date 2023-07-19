const config = require('config');
const AWS = require('aws-sdk');
const s3 = require('s3');
const async = require('async');
const helpers = require('../helpers');

const consoleWorkingDir = '-console-data-management';
const getAWSCredentials = prefix => config.get(`app.aws.${helpers.getConfigKey(prefix)}`);

const REGIONS = {
  US_EAST_1: 'us-east-1',
  EU_WEST_1: 'eu-west-1',
  AP_SOUTHEAST_1: 'ap-southeast-1',
};


const getS3Instance = (prefix, region = REGIONS.EU_WEST_1) => {
  const currentAWS = AWS;
  currentAWS.config.update({
    accessKeyId: getAWSCredentials(prefix).key,
    secretAccessKey: getAWSCredentials(prefix).secret,
    region
  });
  return new currentAWS.S3();
};
const GetSESInstance = (prefix) => {
  const CurrentAWS = AWS;
  CurrentAWS.config.update({
    accessKeyId: getAWSCredentials(prefix).key,
    secretAccessKey: getAWSCredentials(prefix).secret,
    region: 'eu-west-1'
  });
  return new CurrentAWS.SES({ apiVersion: '2010-12-01' });
};

// SMTP Username:
//     AKIAJWBEQFCJABGDD3GQ
// SMTP Password:
//     Ah6G4Pr9V2uqIS6TjmCzwlqfKKZvMQrQBmzl9oJbf3Zx

const sesTest = (prefix) => {
  // Create sendEmail params
  const params = {
    Destination: {
      CcAddresses: [],
      ToAddresses: [
        'mher@parurian.me',
      ]
    },
    Message: {
      Body: {
        // Html: {
        //   Charset: 'UTF-8',
        //   Data: 'HTML_FORMAT_BODY'
        // },
        Text: {
          Charset: 'UTF-8',
          Data: 'TEST EMAIL to mm'
        }
      },
      Subject: {
        Charset: 'UTF-8',
        Data: 'Test email'
      }
    },
    Source: 'noreply@zangi.com',
  };


  console.log(params);
  // Create the promise and SES service object
  const sendPromise = GetSESInstance(prefix)
    .sendEmail(params)
    .promise();

  // Handle promise's fulfilled/rejected states
  sendPromise.then(
    (data) => {
      console.log(data);
    }).catch(
    (err) => {
      console.error(err, err.stack);
    });
};

module.exports = {
  uploadFile(buffer, to, callback) {
    const bin = new Buffer(buffer, 'binary');
    const s3 = getS3Instance(this.prefix);
    s3.putObject({
      Bucket: this.prefix + consoleWorkingDir,
      Key: to,
      Body: bin
    }, () => callback(null, true));
  },

  getObject(bucket, key, callback) {
    if (!bucket) {
      bucket = this.prefix + consoleWorkingDir;
    }
    const s3 = getS3Instance(this.prefix);

    s3.getObject({
      Bucket: bucket,
      Key: key
    }, (err, data) => {
      if (err) {
        return callback(err, null);
      }
      return callback(null, data);
    });
  },

  uploadS3File(file, to, callback) {
    const filePath = `${to}/${file.name}`;

    console.log(this.prefix + consoleWorkingDir);
    console.log(filePath);

    const uploader = s3.createClient({
      maxAsyncS3: 20,
      s3RetryCount: 3,
      s3RetryDelay: 1000,
      multipartUploadThreshold: 209715200,
      multipartUploadSize: 157286400,
      s3Options: {
        accessKeyId: this.awsAccess.key,
        secretAccessKey: this.awsAccess.secret
      },
    });
    const params = {
      localFile: file.path,
      s3Params: {
        Bucket: this.prefix + consoleWorkingDir,
        Key: filePath,
        ContentType: this.contentType || 'binary/octet-stream'
      },
    };
    const fileUploader = uploader.uploadFile(params);
    fileUploader.on('error', (err) => {
      callback(err, 'UPLOAD_ERROR');
    });
    fileUploader.on('progress', () => {
      console.log('progress', fileUploader.progressMd5Amount,
        fileUploader.progressAmount, fileUploader.progressTotal);
    });
    fileUploader.on('end', () => {
      callback(null, 'UPLOADED');
    });
  },

  generateSignedUrl(prefix, expire = 86400 * 2) {
    const s3 = getS3Instance(this.prefix);

    return s3.getSignedUrl('getObject', {
      Bucket: this.prefix + consoleWorkingDir,
      Key: prefix,
      Expires: expire
    });
  },

  createAWSBuckets({ prefix }) {
    return (callback) => {
      const s3 = getS3Instance(prefix);
      const buckets = [consoleWorkingDir].map(dir => prefix + dir);

      async.each(buckets, (bucket, eachCallback) => {
        s3.createBucket({ Bucket: bucket }, (err) => {
          if (err) {
            console.log(err);
            return callback(err);
          }
          eachCallback();
          console.log('Bucket', bucket, 'created successfully');
        });
      }, (err, result) => {
        if (err) {
          return callback(err);
        }
        callback(result);
      });
    };
  },
  sesTest,
  upload({ prefix, bucket, key, buffer }) {
    return new Promise((resolve, reject) => {
      const file = new Buffer(buffer, 'binary');
      const s3 = getS3Instance(prefix);
      s3.putObject({
        Bucket: bucket,
        Key: key,
        Body: file
      }, (err, result) => {
        if (err) {
          return reject(err);
        }
        resolve(result);
      });
    });
  },
  delete({ prefix, bucket, keys }) {
    return new Promise((resolve, reject) => {
      const s3 = getS3Instance(prefix);
      const objects = keys.map(key => ({ Key: key }));


      console.log(JSON.stringify({
        Bucket: bucket,
        Delete: {
          Objects: objects,
        },
      }));


      s3.deleteObjects({
        Bucket: bucket,
        Delete: {
          Objects: objects,
        },
      }, (err, result) => {
        if (err) {
          return reject(err);
        }
        resolve(result);
      });
    });
  },
  signedUrl({ prefix, bucket, key, expire = 86400 * 2, region = null }) {
    return new Promise((resolve, reject) => {
      const s3 = getS3Instance(prefix, region);
      s3.getSignedUrl('getObject', {
        Bucket: bucket,
        Key: key,
        Expires: expire
      }, (err, result) => {
        if (err) {
          return reject(err);
        }
        resolve(result);
      });
    });
  },
  REGIONS
};
