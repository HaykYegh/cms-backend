const sql = require('../db');
const logger = require('../logger');
const utils = require('../../helpers/utils');
const emailService = require('../email');


const toPlainObject = require('lodash/toPlainObject');

const networkQueries = sql.queries.networks;

async function networkSignIn({
  email, password, withExpiration
}) {
  const client = sql.getDB();
  const query = await client
    .query(networkQueries.modules.authentication.signIn,
      [email, password]);
  const admin = query.rows[0];


  if (!admin) {
    throw new Error('INVALID_ADMIN');
  }

  const expiresIn = (withExpiration && 30 * 24 * 60 * 60 * 1000 * 3600) || null;
  const jwtToken = await utils.jwt.sign({ dataToStore: toPlainObject(admin) }, { expiresIn });

  return {
    authToken: jwtToken,
    admin
  };
}


async function requestResetPassword({
  email
}) {
  const client = sql.getDB();
  const query = await client
    .query(networkQueries.modules.authentication.requestResetPassword,
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
  const link = `https://business.zangi.com/reset-password/${recoveryToken}`;

  const message = utils.replaceAll(emailTemplate.content,
    {
      '{link}': link,
    });

  logger.info(link);
  await emailService.sendMail(requestForReset.prefix)({ to, subject, message });
  return true;
}
async function resetPassword({ token, password }) {
  const client = sql.getDB();
  const query = await client
    .query(networkQueries.modules.authentication.resetPassword,
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
    .query(networkQueries.modules.authentication.validateRecoveryToken, [token]);
  const requestForReset = query.rows[0];
  if (!requestForReset) {
    throw new Error('INVALID_TOKEN');
  }
  return requestForReset;
}

module.exports = {
  signIn: networkSignIn,
  recoverPassword: {
    requestResetPassword,
    validateRecoveryToken,
    resetPassword
  }
};
