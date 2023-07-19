const config = require('config');
const nodemailer = require('nodemailer');
const fs = require('fs');
const sql = require('./db');
const helpers = require('../helpers');

const CONSTANTS = {
  SIGN_UP_ADMIN: 1,
  REQUEST_RESET_PASSWORD: 2,
  VERIFY_NETWORK_REQUEST: 3,
  VERIFIED_VIRTUAL_NETWORK: 4,
  NETWORK_REQUEST_RESET_PASSWORD: 5,
  WELCOME_ZANGI_FOR_BUSINESS: 6,
  ZANGI_FOR_BUSINESS_NEW_ACCOUNT: 7
};


const emailQueries = sql.queries.email;

function sendMail({ prefix, configKey }) {
  return (from, to, subject, html, callback) => {
    const emailConfig = config.get(`email.${configKey || helpers.getConfigKey(prefix)}`);
    if (!from) {
      from = emailConfig.username;
    }
    const transporter = nodemailer.createTransport({
      host: emailConfig.host,
      port: emailConfig.port,
      secure: emailConfig.secure,
      auth: {
        user: emailConfig.username,
        pass: emailConfig.password
      }
    });
    const mailOptions = {
      to,
      from,
      subject,
      html
    };
    transporter.sendMail(mailOptions, (err, info) => {
      console.log(err);
      console.log(info);
      if (err) {
        return callback(err, null);
      }
      return callback(null, info);
    });
  };
}

function send(to, subject, message, callback) {
  const emailConfig = this.config;

  const transporter = nodemailer.createTransport({
    host: emailConfig.host,
    port: emailConfig.port,
    secure: emailConfig.secure,
    auth: {
      user: emailConfig.username,
      pass: emailConfig.password
    }
  });
  const mailOptions = {
    to,
    from: emailConfig.username,
    subject,
    html: message
  };
  transporter.sendMail(mailOptions, (err, info) => {
    if (err) {
      return callback(err, null);
    }
    return callback(null, info);
  });
}


function attemptSendMail(prefix) {
  let emailConfig;
  try {
    emailConfig = config.get(`email.${helpers.getConfigKey(prefix)}`);
  } catch (e) {
    emailConfig = config.get('email.zz');
  }
  return ({ to, subject, message }) => new Promise((resolve, reject) => {
    const transporter = nodemailer.createTransport({
      host: emailConfig.host,
      port: emailConfig.port,
      secure: emailConfig.secure,
      auth: {
        user: emailConfig.username,
        pass: emailConfig.password
      }
    });
    const mailOptions = {
      to,
      from: emailConfig.username,
      subject,
      html: message
    };
    transporter.sendMail(mailOptions, (err, info) => {
      if (err) {
        reject(err);
      } else {
        resolve(info);
      }
    });
  });
}


async function getEmailTemplate(db, { templateId }) {
  const client = db || sql.getDB() || sql;
  const query = await client
    .query(emailQueries.get.one,
      [templateId]);
  return query.rows[0];
}


module.exports = {

  get: {
    one: getEmailTemplate
  },
  sendMail: attemptSendMail,
  CONSTANTS,


  requestResetPassword({ configKey, prefix }) {
    return (email, link, callback) => {
      const sqlQuery = {
        params: [
          CONSTANTS.REQUEST_RESET_PASSWORD
        ],
        raw: fs.readFileSync('sql/email/email-template-by-id.sql').toString()
      };
      sql.getDB().query(sqlQuery.raw, sqlQuery.params)
        .then((data) => {
          const result = data.rows[0];
          if (result) {
            const subject = result.subject;
            const html = result.content.replace(/{link}/g, link);
            sendMail({ configKey, prefix })(null, email, subject, html, (err, sender) => {
              if (err) {
                callback(err, null);
              } else {
                callback(null, sender);
              }
            });
          } else {
            callback('INVALID_TEMPLATE_ID', null);
          }
        })
        .catch((err) => {
          callback(err, null);
        });
    };
  },
  signUp({ prefix, customerName }, email, password, success) {
    global.sql.first('email-template-by-id', [CONSTANTS.SIGN_UP_ADMIN], (err, result) => {
      if (err) {
        return success(err, null);
      }
      const subject = result.subject;
      const consoleUrl = config.get(`app.baseUrl.client.${helpers.getConfigKey(prefix)}`);

      const html = result.content
        .replace(/{email}/g, email)
        .replace(/{password}/g, password)
        .replace(/{customerName}/g, customerName)
        .replace(/{consoleUrl}/g, consoleUrl);

      sendMail({ prefix })(null, email, subject, html, callback => success(null, callback));
    });
  },
  send
};

