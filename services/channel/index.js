const sql = require('../db');
const fetch = require('node-fetch');

const channelQueries = sql.queries.channels;
const userQueries = sql.queries.users;

async function getChannelInfo(db, { ownerIds, adminIds, memberIds, prefix }) {
  const client = db || sql.getDB();
  const ownerQuery = client
    .query(channelQueries.get.all.channelInfo.records,
      [ownerIds, prefix]);
  const adminQuery = client
    .query(channelQueries.get.all.channelInfo.records,
      [adminIds, prefix]);
  const memberQuery = client
    .query(channelQueries.get.all.channelInfo.records,
      [memberIds, prefix]);

  const [ownerQueryResult, adminQueryResult, memberQueryResult] = await Promise
    .all([ownerQuery, adminQuery, memberQuery]);
  return {
    owners: ownerQueryResult.rows,
    admins: adminQueryResult.rows,
    members: memberQueryResult.rows
  };
}

async function getChannelSubjectsAndEmailsOrNicknames(db, { channels, users, nickname }) {
  const client = db || sql.getDB();

  const channelSubjectsQuery = client
    .query(channelQueries.get.all.channelInfo.channels,
      [channels]);
  let usersQueryRes;
  if (nickname) {
    usersQueryRes = client
      .query(userQueries.get.recordsWidthNickname,
        [users]);
  } else {
    usersQueryRes = client
      .query(userQueries.get.recordsWidthEmail,
        [users]);
  }

  const [channelSubjectsQueryResult, usersQueryResult] = await Promise
    .all([channelSubjectsQuery, usersQueryRes]);
  return {
    channels: channelSubjectsQueryResult.rows,
    users: usersQueryResult.rows
  };
}

async function getChannelEmails(db, { users }) {
  const client = db || sql.getDB();
  const usersQueryResult = await client
    .query(userQueries.get.recordsWidthEmail,
      [users]);

  return usersQueryResult.rows;
}

async function getChannelNicknames(db, { users }) {
  const client = db || sql.getDB();
  const usersQueryResult = await client
    .query(userQueries.get.recordsWidthNickname,
      [users]);

  return usersQueryResult.rows;
}

async function getChannel(db, { prefix, channelRoom }) {
  const response = await fetch(`http://ec2-52-50-69-3.eu-west-1.compute.amazonaws.com:9090/plugins/channels/getChannelInfo?prefix=${prefix}&roomName=${channelRoom}&offset=0&limit=0`);
  const data = await response.json();
  return data;
}

async function getChannelUsers(db, { channel }) {
  const client = db || sql.getDB();
  const channelUsersQuery = await client
    .query(channelQueries.get.all.channelUsers.records,
      [channel]);
  return channelUsersQuery.rows;
}

module.exports = {
  get: {
    all: {
      channelInfo: getChannelInfo,
      channelUsers: getChannelUsers,
      channelSubjectsAndEmailsOrNicknames: getChannelSubjectsAndEmailsOrNicknames,
      channelEmails: getChannelEmails,
      channelNicknames: getChannelNicknames,
    },
    one: {
      channel: getChannel,
    },
  },
};
