const fs = require('fs');
const util = require('util');
const request = require('request');
const config = require('config');
const sql = require('./db');
const logger = require('./logger');
const awsService = require('./aws');
const helpers = require('../helpers');

const customerService = require('./customers');

const chunk = require('lodash/chunk');

const readFile = util.promisify(fs.readFile);

const systemMessageQueries = sql.queries.systemMessages;
const networkQueries = sql.queries.networks;

const DEFAULT_SENDER = '18557656555';


const bulkSend = (from, message, numbers) =>
  new Promise((resolve, reject) => {
    logger.info(`from=${from}, message=${message}, numbersCount=${numbers.length}`);
    const data = {
      from: from || DEFAULT_SENDER,
      body: message,
      users: numbers,
    };
    request.post(`${config.get('openFire.host')}/plugins/zservlet/sendmsgbylist`, {
      json: data,
      headers: {
        'Content-Type': 'application/json'
      }
    }, (err, httpResponse, result) => {
      if (err) {
        logger.error(err);
        return reject('NETWORK_ERROR');
      }
      if (!result.err) {
        return resolve(result);
      }
      return reject('SIGNALING_ERROR');
    });
  });


const sendViaSender = (sender, message, numbers) => new Promise((resolve, reject) => {
  const data = {
    sender,
    message,
    usernameList: numbers,
  };

  request.post(`${config.get('openFire.host')}/plugins/zservlet/sendSystemMessageFromSender`, {
    json: data,
    headers: {
      'Content-Type': 'application/json'
    }
  }, (err, httpResponse, result) => {
    if (err) {
      logger.error(err);
      return reject('INVALID_REQUEST');
    }
    if (!result.err) {
      return resolve(result);
    }
    return reject('SIGNALING_ERROR');
  });
});


function getDeepLinkConfig(prefix) {
  try {
    const handler = config.get(`deepLinkConfig.${helpers.getConfigKey(prefix)}`);
    console.log(handler);
    return handler;
  } catch (e) {
    return {
      uri: 'https://zangi.com/networks',
      serviceUri: 'https://zangi.com/services',
    };
  }
}


const systemMessageTemplates = {
  networks: {
    invite: `You have been invited to join {label} network. Tap the following link to join:
{uri}/{token}`
  },
  channels: {
    invite: `You have been invited to join {label} channel. Tap the following link to join:
{uri}`
  },
  services: {
    invite: `You have been invited to join {service} service of {network} network. Tap the following link to join:
{uri}/{token}`
  },
};

function replaceAll(str, mapObj) {
  const re = new RegExp(Object.keys(mapObj).join('|'), 'gi');
  return str.replace(re, matched => mapObj[matched.toLowerCase()]);
}


async function getUsersCount(params) {
  const { customerId, platforms, countries } = params;
  const { startsWith, networkId = null, serviceId = null, startsWithNickname = null } = params;

  const platformIds = platforms.split(',');
  const countryIds = countries.split(',');

  logger.info(`serviceId=${serviceId}, platformIds=${platformIds}, countryIds=${countryIds},customerId=${customerId}`);
  logger.info(`sqlPath=${systemMessageQueries.users.count}`);

  const sqlResult = await sql.getDB()
    .query(systemMessageQueries.users.count,
      [customerId, JSON.stringify(platformIds), JSON.stringify(countryIds),
        startsWith, networkId, serviceId, startsWithNickname]);
  logger.info(sqlResult.rows);
  return parseInt(sqlResult.rows[0].count, 10);
}


async function getUsers(params) {
  const { customerId, platforms, countries } = params;
  const { startsWith, networkId = null, serviceId = null, startsWidthNickname = null } = params;

  const platformIds = platforms.split(',');
  const countryIds = countries.split(',');
  logger.info([customerId, JSON.stringify(platformIds), JSON.stringify(countryIds),
    startsWith, networkId, serviceId]);
  const sqlResult = await sql.getDB().query(systemMessageQueries.users.records,
    [customerId, JSON.stringify(platformIds), JSON.stringify(countryIds),
      startsWith, networkId, serviceId, startsWidthNickname]);
  return sqlResult.rows;
}

async function sendServerMessage({ username, command, params }) {
  return new Promise((resolve) => {
    // logger.info(`username=${username}, command=${command}, params=${params}`);
    const data = {
      to: username,
      body: params,
      type: command,
    };
    // request.post('http://ec2-52-50-69-3.eu-west-1.compute.amazonaws.com:9090/plugins/zservlet/sendSystemMessage', {
    request.post(`${config.get('openFire.host')}/plugins/zservlet/sendSystemMessage`, {
      json: data,
      headers: {
        'Content-Type': 'application/json'
      }
    }, (err, httpResponse, result) => {
      if (err) {
        logger.error(err);
        return resolve('NETWORK_ERROR');
      }
      if (!result.err) {
        return resolve(result);
      }
      return resolve('SIGNALING_ERROR');
    });
  });
}

async function broadcastServerMessage({ networkId, command, params }) {
  // logger.info(`networkId=${networkId}, command=${command}, params=${params}`);
  console.log({ networkId, command, params });

  const networkUsersQuery = await sql.getDB().query(networkQueries.get.users, [networkId]);

  const networkUsersNotifierPromises = networkUsersQuery
    .rows
    .map(user =>
      sendServerMessage({
        username: user.username,
        command,
        params
      }));

  const promisesChunk = chunk(networkUsersNotifierPromises, 50);

  for (const promises of promisesChunk) {
    await Promise.all(promises);
  }
}


async function createSender(db, { customerId, label, number, isVerified }) {
  const client = db || sql.getDB();

  const sqlResult = await client.query(systemMessageQueries.senders.create.sender,
    [customerId, label, number, isVerified]);
  return sqlResult.rows[0];
}

async function updateSender(db, { customerId, senderId, label, number, isVerified }) {
  const client = db || sql.getDB();

  const sqlResult = await client.query(systemMessageQueries.senders.update.sender,
    [customerId, senderId, label, number, isVerified]);
  return sqlResult.rows[0];
}

async function deleteSender(db, { customerId, senderId }) {
  const client = db || sql.getDB();

  await client.query(systemMessageQueries.senders.delete.senderImage, [senderId]);
  const sqlResult =
      await client.query(systemMessageQueries.senders.delete.sender, [customerId, senderId]);
  return sqlResult.rows[0];
}


async function getSenderList(db, params) {
  const client = db || sql.getDB();
  const { customerId, networkId = null, serviceId = null, limit, offset } = params;

  const sqlResult = await client.query(systemMessageQueries.senders.list.senders,
    [customerId, networkId, serviceId, limit, offset]);
  return sqlResult.rows;
}


async function getSendersCount(db, { customerId }) {
  const client = db || sql.getDB();
  const sqlResult = await client.query(systemMessageQueries.senders.count.senders, [customerId]);
  return sqlResult.rows[0];
}

async function getSender(db, { customerId, senderId }) {
  const client = db || sql.getDB();
  const sqlResult = await client.query(systemMessageQueries.senders.retrieve.sender,
    [customerId, senderId]);
  return sqlResult.rows[0];
}

async function getSenderImages(db, { customerId, senderId }) {
  const client = db || sql.getDB();
  const sqlResult = await client.query(systemMessageQueries.senders.list.images,
    [customerId, senderId]);

  if (sqlResult.rows.length === 0) {
    return sqlResult.rows;
  }

  const { prefix } = customerService.get.customerId(customerId);
  const senderImages = [];
  const awsRegions = awsService.REGIONS;


  for (const image of sqlResult.rows) {
    const signedUrl = await awsService
      .signedUrl({
        prefix,
        bucket: image.bucket,
        key: image.key,
        region: awsRegions.US_EAST_1
      });
    const senderImage = { ...image, signedUrl };
    senderImages.push(senderImage);
  }
  return senderImages;
}

async function createOrUpdateSenderAvatar(db, { customerId, senderId, files }) {
  logger.info({ customerId, senderId, files });

  const client = await sql.getDB().connect();
  let result;
  try {
    await client.query('BEGIN');
    logger.info('> TRANSACTION START');

    const { prefix } = customerService.get.customerId(customerId);

    let bucket;
    try {
      const awsConfig = config.get(`app.aws.${helpers.getConfigKey(prefix)}`);
      bucket = awsConfig.buckets.messageSender;
    } catch (e) {
      logger.error(e);
      throw new Error('BUCKET_CONFIG_ERROR');
    }

    const sender = await getSender(client, { customerId, senderId });
    if (!sender) {
      throw new Error('INVALID_SENDER');
    }
    logger.info('> sender ');
    logger.info(sender);


    const senderImage = sender.image;
    logger.info('senderImage');
    logger.info(senderImage);


    if (senderImage && senderImage.filename) {
      try {
        await awsService.delete({
          prefix,
          bucket,
          keys: [senderImage.key]
        });
      } catch (e) {
        logger.info(e);
        logger.info('EMPTY IMAGE');
      }
    }

    const filename = Date.now();
    const key = `${customerId}/${senderId}/${filename}`;
    const imageInsertQuery = systemMessageQueries.senders.update.image;

    const imageQuery = await client
      .query(imageInsertQuery, [senderId, filename, key, bucket]);

    const updated = imageQuery.rows[0];
    logger.info('> UPDATED IMAGE ');
    logger.info(updated);

    const updatedImage = updated.filename || null;

    if (!updatedImage) {
      throw new Error('IMAGE_UPSERT_ERROR');
    }
    logger.info('UPLOADED FILES');
    logger.info(files);
    const imageFile = files.files.image;

    if (!imageFile) {
      throw new Error('INVALID_IMAGE_FILE');
    }

    const imageAttributes = {
      prefix,
      bucket: updated.bucket,
      key: updated.key,
      buffer: await readFile(imageFile.path)
    };
    logger.info('IMAGE META');

    await awsService.upload(imageAttributes);

    result = updated;

    await client.query('COMMIT');
  } catch (e) {
    logger.error(e);
    await client.query('ROLLBACK');
    throw e;
  } finally {
    logger.info('> TRANSACTION END');
    client.release();
  }

  return result;
}

async function getChannelUsersCount(params) {
  const { customerId, platforms, countries } = params;
  const { startsWith, channelId = null } = params;

  const platformIds = platforms.split(',');
  const countryIds = countries.split(',');

  logger.info(`platformIds=${platformIds}, countryIds=${countryIds},customerId=${customerId}`);
  logger.info(`sqlPath=${systemMessageQueries.channelUsers.count}`);

  const sqlResult = await sql.getDB()
    .query(systemMessageQueries.channelUsers.count,
      [customerId, JSON.stringify(platformIds), JSON.stringify(countryIds),
        startsWith, channelId]);
  logger.info(sqlResult.rows);
  return parseInt(sqlResult.rows[0].count, 10);
}

async function getChannelUsers(params) {
  const { customerId, platforms, countries } = params;
  const { startsWith, channelId = null } = params;

  const platformIds = platforms.split(',');
  const countryIds = countries.split(',');

  const sqlResult = await sql.getDB().query(systemMessageQueries.channelUsers.records,
    [customerId, JSON.stringify(platformIds), JSON.stringify(countryIds),
      startsWith, channelId]);
  return sqlResult.rows;
}

module.exports = {
  bulkSend,
  templates: systemMessageTemplates,
  deepLinkConfig: getDeepLinkConfig,
  replaceAll,
  users: {
    getUsersCount,
    getUsers,
    getChannelUsersCount,
    getChannelUsers,
  },
  toServer: {
    send: sendServerMessage,
    broadcast: broadcastServerMessage,
    sendViaSender
  },
  senders: {
    create: {
      sender: createSender,
      image: createOrUpdateSenderAvatar
    },
    retrieve: {
      sender: getSender,
    },
    update: {
      sender: updateSender
    },
    delete: {
      sender: deleteSender
    },
    list: {
      senders: getSenderList,
      images: getSenderImages,

    },
    count: {
      senders: getSendersCount
    }
  }
};
