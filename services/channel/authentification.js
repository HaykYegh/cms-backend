const config = require('config');
const sql = require('../db');
const fetch = require('node-fetch');
const logger = require('../logger');
const utils = require('../../helpers/utils');
const emailService = require('../email');


const toPlainObject = require('lodash/toPlainObject');

const channelQueries = sql.queries.channels;

async function requestResetPassword({
  email
}) {
  const client = sql.getDB();
  const query = await client
    .query(channelQueries.modules.authentication.requestResetPassword,
      [email]);
  const requestForReset = query.rows[0];

  if (!requestForReset) {
    throw new Error('INVALID_ADMIN');
  }

  const prefix = requestForReset.prefix;
  const recoveryToken = requestForReset.recoveryToken;

  if (!prefix) {
    throw new Error('INVALID_CUSTOMER');
  }

  const templateId = emailService.CONSTANTS.NETWORK_REQUEST_RESET_PASSWORD;
  const emailTemplate = await emailService.get.one(client, { templateId });
  const to = email;
  const subject = emailTemplate.subject;
  const link = `http://ig-channel.zangi.io/reset-password/${recoveryToken}`;

  const message = utils.replaceAll(emailTemplate.content,
    {
      '{link}': link,
    });

  logger.info(link);
  await emailService.sendMail(requestForReset.prefix)({ to, subject, message });
  return true;
}

async function channelSignIn({
  email, password, withExpiration
}) {
  const client = sql.getDB();
  const query = await client
    .query(channelQueries.modules.authentication.signIn,
      [email, password]);
  const admin = query.rows[0];

  console.log(admin, 'admin');

  if (!admin) {
    throw new Error('INVALID_ADMIN');
  }
  const prefix = admin.customer.prefix;
  const channelRoom = admin.roomName;
  try {
    const openFireConf = config.get('openFire');
    const response = await fetch(`${openFireConf.host}/plugins/channels/getChannelInfo?prefix=${prefix}&roomName=${channelRoom}&offset=0&limit=0`)
    const data = await response.json();
    console.log(data, 'data1234');
    if (data.err) {
      throw new Error('INVALID_ADMIN');
    }
    admin.channel = data.result;
  } catch (e) {
    throw new Error('INVALID_ADMIN');
  }

  const expiresIn = (withExpiration && 30 * 24 * 60 * 60 * 1000 * 3600) || null;
  const jwtToken = await utils.jwt.sign({ dataToStore: toPlainObject(admin) }, { expiresIn });

  return {
    authToken: jwtToken,
    admin
  };
}

async function resetPassword({ token, password }) {
  const client = sql.getDB();
  const query = await client
    .query(channelQueries.modules.authentication.resetPassword,
      [token, password]);
  const resetResult = query.rows[0];
  if (!resetResult) {
    throw new Error('INVALID_TOKEN');
  }
  return resetResult;
}

async function validateRecoveryToken({ token }) {
  const client = sql.getDB();
  const query = await client
    .query(channelQueries.modules.authentication.validateRecoveryToken, [token]);
  const requestForReset = query.rows[0];
  if (!requestForReset) {
    throw new Error('INVALID_TOKEN');
  }
  return requestForReset;
}

module.exports = {
  signIn: channelSignIn,
  recoverPassword: {
    requestResetPassword,
    validateRecoveryToken,
    resetPassword
  }
};
