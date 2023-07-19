const Nexmo = require('nexmo');
const twillo = require('twilio');
const nodemailer = require('nodemailer');
const request = require('request');

const sql = require('./db');


const emailService = require('./email');


const hasOwnProperty = Object.prototype.hasOwnProperty;


const providerQueries = sql.queries.providers;


function smtpConsumer(params) {
  const { config, receiver, subject, message } = params;
  return new Promise((resolve, reject) => {
    const transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: {
        user: config.username,
        pass: config.password
      }
    });
    const mailOptions = {
      to: receiver,
      from: config.emailAddress  || '"Zangi Console" <console@zangi.com>',
      subject,
      text: message
    };
    transporter.sendMail(mailOptions, (err, info) => {
      if (err) {
        return reject(err);
      }

      return resolve(info);
    });
  });
}
function twilloConsumer(params) {
  const { config, receiver, message } = params;

  const accountSid = config.accountSid;
  const authToken = config.authToken;
  const twilloInstance = twillo(accountSid, authToken);
  const from = config.from;

  return twilloInstance.messages
    .create({ from, body: message, to: `+${receiver}` })
    .done();
}
function nexmoConsumer(params) {
  const { config, receiver, message } = params;

  return new Promise((resolve, reject) => {
    const nexmo = new Nexmo({
      apiKey: config.apiKey,
      apiSecret: config.apiSecret
    });
    return nexmo.message.sendSms(
      config.from, receiver, message, { type: 'unicode' },
      (err, responseData) => {
        if (err) {
          reject(err);
        } else {
          resolve(responseData);
        }
      }
    );
  });
}
function mainbergConsumer(params) {
  const { config, receiver, message } = params;
  return new Promise((resolve, reject) => {
    request.get('http://appsrv.mainberg.net/smsgateway/API/Zangi', {
      qs: {
        user: config.user,
        pass: config.pass,
        mask: config.mask,
        phoneNumber: receiver,
        message,
      }
    }, (err, httpResponse, result) => {
      if (err) {
        return reject(err);
      }
      let reply;
      try {
        reply = JSON.parse(result);
      } catch (e) {
        return reject(e);
      }
      resolve(reply);
    });
  });
}


// ############# Deprecated  #############
function twilloProvider(to, message, provider, callback) {
  const accountSid = provider.config.accountSid;
  const authToken = provider.config.authToken;
  const twilloInstance = twillo.call(null, accountSid, authToken);
  const from = provider.config.from;

  twilloInstance.messages
    .create({ from, body: message, to: `+${to[0]}` })
    .then(message => callback(null, message.sid))
    .done();
}

function nexmoProvider(to, message, provider, callback) {
  const config = provider.config;

  const nexmo = new Nexmo({
    apiKey: config.apiKey,
    apiSecret: config.apiSecret
  });
  nexmo.message.sendSms(
    config.from, to, message, { type: 'unicode' },
    (err, responseData) => {
      if (err) {
        callback(err, null);
      } else {
        callback(null, responseData);
      }
    }
  );
}

function gmailProvider(to, message, provider, callback) {
  const config = provider.config;

  // if (!utils.validateEmail(to)) {
  //   return callback({ err: 'INVALID EMAIL', data: { to } }, null);
  // }

  emailService.send.call(config, to, 'Admin Email', message, (err, responseData) => {
    if (err) {
      callback(err, null);
    } else {
      callback(null, responseData);
    }
  });
}


function mainbergProvider(to, message, provider, callback) {
  const config = provider.config;
  request.get('http://appsrv.mainberg.net/smsgateway/API/Zangi', {
    qs: {
      user: config.user,
      pass: config.pass,
      mask: config.mask,
      phoneNumber: to,
      message,
    }
  }, (err, httpResponse, result) => {
    if (err) {
      global.log.error(err);
      return callback(err, null);
    }
    let reply;
    try {
      reply = JSON.parse(result);
    } catch (e) {
      global.log.error(e);
      global.log.error(result);
      return callback('UNKNOWN_ERROR', null);
    }
    callback(null, reply);
  });
}

const serviceTypes = {
  TWILLO: twilloProvider,
  NEXMO: nexmoProvider,
  MAINBERG: mainbergProvider,
  GMAIL: gmailProvider,
  SMTP: smtpConsumer
};


// ############# Deprecated end #############


const CONSUMERS = {
  SMTP: smtpConsumer,
  TWILLO: twilloConsumer,
  NEXMO: nexmoConsumer,
  MAINBERG: mainbergConsumer,
};


async function getProvidersCount(db, { customerId, providerType }) {
  const client = db || sql.getDB();
  const sqlResult = await client.query(providerQueries.count.providers, [customerId, providerType]);
  return sqlResult.rows[0];
}

async function getProviders(db, { customerId, providerType = null, limit, offset }) {
  const client = db || sql.getDB();
  const sqlResult = await client.query(providerQueries.list.providers,
    [customerId, providerType, limit, offset]);
  return sqlResult.rows;
}

async function getProvider(db, { customerId, providerId }) {
  const client = db || sql.getDB();
  const sqlResult = await client.query(providerQueries.retrieve.provider, [customerId, providerId]);
  const result = sqlResult.rows[0];
  if (result) {
    return result;
  }
  throw new Error('INVALID_PROVIDER');
}


async function deleteProvider(db, { customerId, providerId }) {
  const client = db || sql.getDB();
  const sqlResult = await client.query(providerQueries.delete.provider, [customerId, providerId]);
  const deleted = sqlResult.rows[0];
  if (deleted) {
    return deleted;
  }
  throw new Error('INVALID_PROVIDER');
}

async function updateProvider(db, { customerId, providerId, label, config, orderNumber, active }) {
  const client = db || sql.getDB();
  const sqlResult = await client.query(providerQueries.update.provider,
    [customerId, providerId, label, config, orderNumber, active]);
  const updated = sqlResult.rows[0];
  if (updated) {
    return updated;
  }
  throw new Error('INVALID_PROVIDER');
}

async function createProvider(db, { customerId, tp2Id, label, config, orderNumber }) {
  const client = db || sql.getDB();
  const sqlResult = await client.query(providerQueries.create.provider,
    [customerId, tp2Id, label, config, orderNumber]);
  return sqlResult.rows[0];
}

async function getProviderTypes(db, { limit, offset }) {
  const client = db || sql.getDB();
  const sqlResult = await client.query(providerQueries.list.providerTypes, [limit, offset]);
  return sqlResult.rows;
}

async function getProviderTypesCount(db) {
  const client = db || sql.getDB();
  const sqlResult = await client.query(providerQueries.count.providerTypes);
  return sqlResult.rows[0];
}


async function deleteProviderCountry(db, { customerId, providerId, providerCountryId }) {
  const client = db || sql.getDB();
  const sqlResult = await client.query(providerQueries.delete.country,
    [customerId, providerId, providerCountryId]);
  const isDeleted = sqlResult.rowCount > 0;
  if (isDeleted) {
    return { isDeleted };
  }
  throw new Error('INVALID_PROVIDER');
}

async function deleteCountryProvider(db, { customerId, countryProviderId }) {
  const client = db || sql.getDB();
  const sqlResult = await client.query(providerQueries.delete.countryProvider,
    [customerId, countryProviderId]);
  const isDeleted = sqlResult.rowCount > 0;
  if (isDeleted) {
    return { isDeleted };
  }
  throw new Error('INVALID_PROVIDER');
}


async function createProviderCountry(db, { customerId, providerId, countryId }) {
  const client = db || sql.getDB();
  try {
    const sqlResult = await client.query(providerQueries.create.country,
      [customerId, providerId, countryId]);
    const result = sqlResult.rows[0];

    if (result) {
      return result;
    }
    throw new Error('INVALID_PROVIDER');
  } catch (e) {
    throw new Error('PROVIDER_COUNTRY_ALREADY_EXISTS');
  }
}

async function getProviderCountries(db, { customerId, providerId, limit, offset }) {
  const client = db || sql.getDB();
  const sqlResult = await client.query(providerQueries.list.countries,
    [customerId, providerId, limit, offset]);
  return sqlResult.rows;
}

async function getProviderCountriesCount(db, { customerId, providerId }) {
  const client = db || sql.getDB();
  const sqlResult = await client.query(providerQueries.count.countries, [customerId, providerId]);
  return sqlResult.rows[0];
}


async function transmitMessage(db, params) {
  const { customerId, providerId, receivers, subject, message } = params;
  const client = db || sql.getDB();
  const provider = await getProvider(client, { customerId, providerId });
  const consumer = CONSUMERS[provider.name] || null;
  if (!consumer || typeof consumer !== 'function') {
    throw new Error('CONSUMER_NOT_IMPLEMENTED');
  }

  try {
    // eslint-disable-next-line no-restricted-syntax
    for (const receiver of receivers) {
      // eslint-disable-next-line no-await-in-loop
      await CONSUMERS[provider.name]
        .call(null, { config: provider.config, receiver, subject, message });
    }
    return { isTransmitted: true };
  } catch (e) {
    throw new Error('CONSUMER_INVALID_CONFIGURATION');
  }
}


async function getCountryProviders(db, { customerId }) {
  const client = db || sql.getDB();
  const sqlResult = await client
    .query(providerQueries.list.countryProviders, [customerId]);
  return sqlResult.rows;
}


async function retrieveCountryProviders(db, { customerId, countryId }) {
  const client = db || sql.getDB();
  const sqlResult = await client
    .query(providerQueries.retrieve.countryProviders, [customerId, countryId]);
  return sqlResult.rows;
}

async function createCountryProviders(db, { customerId, countryProviderIds }) {
  const client = db || sql.getDB();
  const sqlResult = await client
    .query(providerQueries.create.countryProviders,
      [customerId, JSON.stringify(countryProviderIds)]);
  return sqlResult.rows;
}


const thirdPartyProviders = {
  providers: {},
  has(providerId) {
    return hasOwnProperty.call(this.providers, providerId);
  },
  set(provider) {
    this.providers[provider.customerThirdPartyProviderId] = provider;
  },
  send({ customerThirdPartyProviderId, toNumber, message }, callback) {
    const provider = this.providers[customerThirdPartyProviderId];

    if (hasOwnProperty.call(serviceTypes, provider.key)) {
      const providerService = serviceTypes[provider.key];

      providerService.call(null, toNumber, message, provider, (err, response) => {
        if (err) {
          callback(err, null);
        } else {
          callback(null, response);
        }
      });
    } else {
      callback('MISSING_PROVIDER_IMPLEMENTATION', null);
    }
  },
  toString() {
    return JSON.stringify(this.providers);
  },
  // delete(providerId) {
  //   return delete this.providers[providerId];
  // },

  transmit: transmitMessage,
  list: {
    providers: getProviders,
    providerTypes: getProviderTypes,
    countries: getProviderCountries,
    countryProviders: getCountryProviders
  },
  count: {
    providers: getProvidersCount,
    providerTypes: getProviderTypesCount,
    countries: getProviderCountriesCount,
  },
  retrieve: {
    provider: getProvider,
    countryProviders: retrieveCountryProviders
  },
  update: {
    provider: updateProvider
  },
  create: {
    provider: createProvider,
    country: createProviderCountry,
    countryProviders: createCountryProviders
  },
  delete: {
    provider: deleteProvider,
    country: deleteProviderCountry,
    countryProvider: deleteCountryProvider,
  }
};


module.exports = thirdPartyProviders;
