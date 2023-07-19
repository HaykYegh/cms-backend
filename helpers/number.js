const redisService = require('../services/redis');

const { AsYouType, getCountryCallingCode } = require('libphonenumber-js');


function getNumberCountry(number) {
  const asYouType = new AsYouType();
  const phoneStr = `+${number}5678956789123456789`;
  const len = 14;
  asYouType.input(phoneStr.substring(0, len));
  return asYouType.metadata._country;
}

function parsePhoneNumber(username, parseCountry, callback) {
  const isValidPrefix = new RegExp('^[a-zA-Z]{2}').test(username);
  const prefix = isValidPrefix ? username.substring(0, 2) : 'zz';
  const phoneNumber = isValidPrefix ? username.substring(2, username.length) : username;
  const regionCode = parseCountry && getNumberCountry.call(null, phoneNumber);

  const result = {
    prefix,
    phoneNumber,
    regionCode
  };


  // console.log(parseCountry);


  if (!result.regionCode) {
    redisService.getCache().hget(redisService.CONSTANTS.HASH.USERS, username, (err, reply) => {
      // console.log(reply);
      if (err) {
        console.error('CACHE_ERROR', err);
        return callback('CACHE_ERROR');
      }
      if (!reply) {
        return callback(`EMPTY_USER: ${phoneNumber}`);
      }
      let user;
      try {
        user = JSON.parse(reply);
      } catch (e) {
        return callback('INVALID_USER_DATA');
      }
      if (user.country) {
        result.regionCode = user.country.sortName || user.country.regionCode;
        if (!result.regionCode) {
          return callback('EMPTY_REGION_CODE');
        }
        callback(null, result);
      }
    });
  } else {
    callback(null, result);
  }
}


module.exports = {
  parsePhoneNumber,
  getCountryCallingCode
};
