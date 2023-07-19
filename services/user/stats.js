const request = require('request');
const queryString = require('querystring');

const sql = require('../db');
const helpers = require('../../helpers');
const logger = require('../logger');
const customerService = require('../customers');


const usersQueries = require('../../sql/sql-queries');

const getConfig = helpers.billing.config;


// 0|www      | { type: string,
// 0|www      |   username: string,
// 0|www      |   regionCode: string,
// 0|www      |   userId: number,
// 0|www      |   deviceId: number,
// 0|www      |   platformId: number,
// 0|www      |   customerId: number,
// 0|www      |   createdDate: long,
// 0|www      |   email: boolean }


async function updateUserStats(db, data) {
  if (typeof db === 'object') {
    data = db;
    db = null;
  }


  const client = db || sql.getDB();
  const query = {
    sql: usersQueries.usersV2.update.stats,
    params: [
      data.type,
      data.customerId,
      data.userId,
      data.deviceId,
      data.platformId,
      data.regionCode,
      data.email,
      data.username,
      data.createdDate
    ],
  };
  const result = await client.query(query.sql, query.params);
  return result.rows;
}

module.exports = {
  update: {
    stats: updateUserStats,
  },
};
