/* eslint-disable no-restricted-syntax */
const async = require('async');
const fs = require('fs');
const sql = require('./db').getDB();
const customerService = require('./customers');


const constants = {
  conversationTypes: {},
  conversationStatuses: {},
  messageStatuses: {},
};

const validateTarget = (to) => {
  const target = {
    single: false,
    group: false,
    channel: false,
    superGroup: false
  };
  if (to.includes('gid')) {
    target.group = true;
  } else if (to.includes('pid')) {
    target.channel = true;
  } else if (to.includes('sid')) {
    target.superGroup = true;
  } else {
    target.single = true;
  }
  return target;
};

function normalize(data) {
  const packet = JSON.parse(data);
  const { single } = validateTarget(packet.to);

  // TODO remove this :)
  if (packet.isGroup || packet.msgType !== 'TXT' || packet.prefix === '') {
    return;
  }

  const message = {};

  const conversationTypeName = 'SINGLE';
  const conversationType = constants.conversationTypes[conversationTypeName];
  const customerId = customerService.getCustomers().getValue(packet.prefix).customerId;

  if (!customerId) {
    return;
  }
  // TODO Check real conversation type
  message.customerId = customerService.getCustomers().getValue(packet.prefix).customerId;
  message.conversationTypeId = conversationType.conversationTypeId;
  message.body = packet.msg;
  message.createdAt = Math.round(packet.time / 1000);
  message.from = packet.prefix + packet.from;
  message.to = single ? packet.prefix + packet.to : packet.to;
  message.isGroupPeer = !single;
  message.identifier = packet.msgId;

  return message;
}

function getConversationTypes(callback) {
  const sqlQuery = {
    params: [],
    raw: fs.readFileSync('sql/messages/conversations/get-conversation-types.sql').toString()
  };
  sql.query(sqlQuery.raw, sqlQuery.params)
    .then((res) => {
      callback(null, res.rows);
    })
    .catch((e) => {
      console.log('### sqlQuery ###');
      console.log(sqlQuery);
      console.log(e);
      callback('DB_ERROR', null);
    });
}


function getConversationStatuses(callback) {
  const sqlQuery = {
    params: [],
    raw: fs.readFileSync('sql/messages/conversations/get-conversation-statuses.sql').toString()
  };
  sql.query(sqlQuery.raw, sqlQuery.params)
    .then((res) => {
      callback(null, res.rows);
    })
    .catch((e) => {
      console.log('### sqlQuery ###');
      console.log(sqlQuery);
      console.log(e);
      callback('DB_ERROR', null);
    });
}


function getMessageStatuses(callback) {
  const sqlQuery = {
    params: [],
    raw: fs.readFileSync('sql/messages/get-message-statuses.sql').toString()
  };
  sql.query(sqlQuery.raw, sqlQuery.params)
    .then((res) => {
      callback(null, res.rows);
    })
    .catch((e) => {
      console.log('### sqlQuery ###');
      console.log(sqlQuery);
      console.log(e);
      callback('DB_ERROR', null);
    });
}


function storeMessage(packet, callback) {
  const message = normalize(packet);

  if (!message) {
    return;
  }
  // return;


  // console.log(message);


  const sqlQuery = {
    params: [
      message.customerId,
      message.conversationTypeId,
      message.from,
      message.to,
      message.isGroupPeer,
      message.body,
      message.createdAt,
      message.identifier
    ],
    raw: fs.readFileSync('sql/messages/insert-message.sql').toString()
  };


  console.log(sqlQuery.params);

  sql.query(sqlQuery.raw, sqlQuery.params)
    .then((res) => {
      callback(null, res.rows);
    })
    .catch((e) => {
      // console.log('### sqlQuery ###');
      // console.log(sqlQuery);
      console.error(e.detail);
      callback('DB_ERROR', null);
    });
}


function init() {
  async.parallel({
    messageStatuses: getMessageStatuses,
    conversationStatuses: getConversationStatuses,
    conversationTypes: getConversationTypes,
  }, (err, result) => {
    if (err) {
      console.log(err);
    } else {
      for (const conversationStatus of result.conversationStatuses) {
        const conversationStatusName = conversationStatus.name;
        constants.conversationStatuses[conversationStatusName] = conversationStatus;
      }

      for (const messageStatus of result.messageStatuses) {
        const messageStatusName = messageStatus.name;
        constants.messageStatuses[messageStatusName] = messageStatus;
      }

      for (const conversationType of result.conversationTypes) {
        const conversationTypeName = conversationType.name;
        constants.conversationTypes[conversationTypeName] = conversationType;
      }
    }
  });
}


module.exports = {
  init,
  constants,
  set: storeMessage
};
