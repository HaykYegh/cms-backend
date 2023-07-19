const config = require('config');
const fs = require('fs');
const util = require('util');

const sql = require('./db');
const logger = require('./logger');
const awsService = require('./aws');
const helpers = require('../helpers');

const botQueries = sql.queries.chatBot;
const readFile = util.promisify(fs.readFile);


async function getChatBots(db, { customerId, limit, offset }) {
  const client = db || sql.getDB();
  const recordsQuery = client
    .query(botQueries.get.all.chatBots.records, [customerId, limit, offset]);
  const countQuery = client.query(botQueries.get.all.chatBots.count, [customerId]);
  const [recordsQueryResult, countQueryResult] = await Promise.all([recordsQuery, countQuery]);
  return {
    records: recordsQueryResult.rows,
    count: +countQueryResult.rows[0].count,
  };
}
async function getChatBotCredentials(db, { customerId, chatBotId, limit, offset }) {
  const client = db || sql.getDB();
  const recordsQuery = client
    .query(botQueries.get.all.chatBotCredentials.records, [customerId, chatBotId, limit, offset]);

  const countQuery = client
    .query(botQueries.get.all.chatBotCredentials.count, [customerId, chatBotId]);
  const [recordsQueryResult, countQueryResult] = await Promise.all([recordsQuery, countQuery]);
  return {
    records: recordsQueryResult.rows,
    count: +countQueryResult.rows[0].count,
  };
}
async function createChatBot(db, { customerId, nickname, name, description }) {
  const client = db || sql.getDB();
  const query = await client
    .query(botQueries.create.chatBot, [customerId, nickname, name, description]);
  return query.rows[0];
}

async function createChatBotCredential(db, { customerId, chatBotId }) {
  const client = db || sql.getDB();
  const query = await client
    .query(botQueries.create.chatBotCredential, [customerId, chatBotId]);
  return query.rows[0];
}

async function updateChatBot(db, { customerId, chatBotId, name, description }) {
  const client = db || sql.getDB();
  const query = await client
    .query(botQueries.update.chatBot, [customerId, chatBotId, name, description]);
  return query.rows[0];
}
async function deleteChatBot(db, { customerId, chatBotId }) {
  const client = db || sql.getDB();
  const query = await client
    .query(botQueries.delete.chatBot, [customerId, chatBotId]);
  return query.rows[0];
}
async function deleteChatBotCredential(db, { customerId, chatBotId, chatBotCredentialId }) {
  const client = db || sql.getDB();
  const query = await client
    .query(botQueries.delete.chatBotCredential, [customerId, chatBotId, chatBotCredentialId]);
  return { deleted: query.rowCount > 0 };
}
async function getChatBot(db, { customerId, chatBotId, prefix }) {
  const client = db || sql.getDB();
  const query = await client
    .query(botQueries.get.one.chatBot, [customerId, chatBotId]);

  const chatBot = query.rows[0];
  const avatar = chatBot.avatar;

  if (avatar && avatar.bucket && avatar.key && prefix) {
    const signedUrl = await awsService.signedUrl({
      prefix,
      bucket: avatar.bucket,
      key: avatar.key,
    });
    return { signedUrl, ...chatBot };
  }
  return chatBot;
}
async function updateAvatar(db,
  { customerId, prefix, chatBotId, uploaded }) {
  logger.info({ customerId, prefix, chatBotId, uploaded });


  const client = await sql.getDB().connect();
  let result;
  try {
    await client.query('BEGIN');
    logger.info('> TRANSACTION START');


    const awsConfigPath = `app.aws.${helpers.getConfigKey(prefix)}.buckets.chatBot`;
    logger.info(awsConfigPath);
    const awsBucket = config.has(awsConfigPath) ? config.get(awsConfigPath) : null;

    logger.info(`awsBucket=${awsBucket}`);
    if (!awsBucket) {
      throw new Error('BUCKET_NOT_FOUND');
    }

    const chatBot = await getChatBot(client, { customerId, chatBotId });
    logger.info('> chatBot ');
    logger.info(chatBot);


    const avatarConfig = chatBot.avatar;
    logger.info('> avatarConfig ');
    logger.info(avatarConfig);


    const avatarFolder = `${customerId}/avatars/${chatBotId}`;
    logger.info(`avatarFolder=${avatarFolder}`);

    if (avatarConfig && avatarConfig.filename) {
      const avatarKey = `${avatarFolder}/${avatarConfig.filename}`;
      logger.info(`avatarKey=${avatarKey}`);

      try {
        await awsService.delete({ prefix, bucket: awsBucket, keys: [...avatarKey] });
      } catch (e) {
        logger.info(e);
        logger.info('EMPTY AVATAR');
      }
    }

    const avatarQuery = await client
      .query(botQueries.update.chatBotAvatar, [customerId, chatBotId, awsBucket, avatarFolder]);

    const updated = avatarQuery.rows[0];
    logger.info('> UPDATED AVATAR ');
    logger.info(updated);


    const updatedAvatar = updated.avatar || null;

    if (!updatedAvatar) {
      throw new Error('AVATAR_ERROR');
    }
    logger.info('UPLOADED FILES');
    logger.info(uploaded);
    const avatarFile = uploaded.files.avatar;


    const avatarMeta = {
      prefix,
      bucket: updated.avatar.bucket,
      key: updated.avatar.key,
      buffer: await readFile(avatarFile.path)
    };
    logger.info('AVATAR META');
    // logger.info(avatarMeta);

    result = await awsService.upload(avatarMeta);

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


module.exports = {
  get: {
    all: {
      chatBots: getChatBots,
      chatBotCredentials: getChatBotCredentials
    },
    one: {
      chatBot: getChatBot
    }
  },
  create: {
    chatBot: createChatBot,
    chatBotCredential: createChatBotCredential,
  },
  delete: {
    chatBot: deleteChatBot,
    chatBotCredential: deleteChatBotCredential
  },
  update: {
    chatBot: updateChatBot,
    chatBotAvatar: updateAvatar
  }
};
