const request = require('request');
const fs = require('fs');
const moment = require('moment-timezone');
const config = require('config');
const formidable = require('formidable');
const jwt = require('jsonwebtoken');
const { generateNumbers } = require('../services/promo');


function getStartDateInt(str) {
  const start = new Date(str);
  start.setHours(0, 0, 0, 0);
  return Math.round(start.getTime());
}

function getEndDateInt(str) {
  const end = new Date(str);
  end.setHours(23, 59, 59, 999);

  return Math.round(end.getTime());
}

function daysInMonth({ year, month }) {
  return Number(moment(`${year}-${Number(month) + 1}`, 'YYYY-MM').daysInMonth());
}

function validateReCaptcha({ configKey, token, ip }) {
  const reCaptchaConfig = config.get(`app.recaptcha.${configKey}`);

  return new Promise((resolve, reject) => {
    request.post('https://www.google.com/recaptcha/api/siteverify', {
      form: {
        secret: reCaptchaConfig.secret,
        response: token,
        remoteip: ip
      }
    }, (err, response, data) => {
      if (err) {
        return reject(err);
      }
      const body = JSON.parse(data);
      resolve(body);
    });
  });
}

function validateReCaptchaV2({ prefix, token, ip, type }) {
  const conf = type === 'channel' || 'network' ? config.get('google.reCaptchaIG') : config.get('google.reCaptcha');
  const reCaptchaConfig = typeof prefix === 'undefined'
    ? conf : config.get(`app.recaptcha.${prefix}`);
  return new Promise((resolve, reject) => {
    request.post('https://www.google.com/recaptcha/api/siteverify', {
      form: {
        secret: reCaptchaConfig.secret,
        response: token,
        remoteip: ip
      }
    }, (err, response, data) => {
      if (err) {
        return reject(err);
      }
      const body = JSON.parse(data);
      if (body.success) {
        resolve(body);
      } else {
        reject('RECAPTCHA_TOKEN_NOT_VERIFIED');
      }
    });
  });
}

function getUploadedFiles(req) {
  const form = new formidable.IncomingForm();
  return new Promise((resolve, reject) => {
    form.parse(req, (err, fields, files) => {
      if (err) {
        reject(err);
      } else {
        resolve({ fields, files });
      }
    });
  });
}

function spliceSplit(str, index, count, add) {
  const ar = str.split('');
  ar.splice(index, count, add);
  return ar.join('');
}

function generateEmailNumber() {
  const number = spliceSplit((generateNumbers(100000000, 999999999)).toString(), 0, 0);
  return `871${number}`;
}

function replaceAll(str, mapObj) {
  const re = new RegExp(Object.keys(mapObj).join('|'), 'gi');
  return str.replace(re, matched => mapObj[matched.toLowerCase()]);
}


function jwtSign(jwtData, { expiresIn }) {
  return new Promise((resolve, reject) => {
    const jwtSecret = typeof jwtData.secret === 'undefined' ? config.get('jsonWebToken.secret') : jwtData.secret;
    const jwtValueToStore = jwtData.dataToStore;
    const options = {};
    if (expiresIn) {
      options.expiresIn = expiresIn;
    }
    jwt.sign(jwtValueToStore, jwtSecret, options, (err, token) => {
      if (err) {
        return reject(err);
      }
      resolve(token);
    });
  });
}


function parseCookie(cookie) {
  if (!cookie) {
    return;
  }
  const list = {};

  cookie.split(';').forEach((cookie) => {
    const parts = cookie.split('=');
    list[parts.shift().trim()] = decodeURI(parts.join('='));
  });

  return list;
}

function readHTMLFile(path, callback, options = { encoding: 'utf-8' }) {
  fs.readFile(path, options, (err, html) => {
    if (err) {
      throw err;
    } else {
      callback(html);
    }
  });
}

function generatePassword(length = 12) {
  const CHARSET = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let password = '';

  for (let i = 0; i < length; ++i) {
    const random = Math.floor(Math.random() * CHARSET.length);
    password += CHARSET.charAt(random);
  }

  return password;
}

// function findMinMax(arr) {
//   let min = arr[0].y;
//   let max = arr[0].y;
//
//   for (let i = 1, len = arr.length; i < len; i++) {
//     const v = arr[i].y;
//     min = (v < min) ? v : min;
//     max = (v > max) ? v : max;
//   }
//
//   return { min, max };
// }

module.exports = {
  getStartDateInt,
  getEndDateInt,
  validateReCaptcha,
  daysInMonth,
  getUploadedFiles,
  generateEmailNumber,
  generatePassword,
  replaceAll,
  jwt: {
    sign: jwtSign
  },
  reCaptcha: {
    verify: validateReCaptchaV2
  },
  parseCookie,
  readHTMLFile,
};

