const config = require('config');
const request = require('request');
const customerService = require('../services/customers');
const sql = require('./db');

const statsQueries = sql.queries.stats;


function getOnlineUsers({ prefix, limit, offset }) {
  return new Promise((resolve, reject) => {
    const openFireConf = config.get('openFire');
    request.get(`${openFireConf.host}/plugins/zangibilling/getstatistic`, {
      qs: { prefix, limit, offset, provideUserList: 1 }
    }, (err, httpResponse, result) => {
      if (err) {
        return reject('SIGNALING_NETWORK_ERROR');
      }
      let data;
      try {
        data = JSON.parse(result);
      } catch (e) {
        return reject('SIGNALING_SERVICE_ERROR');
      }
      resolve(data.usernameEmailMap);
    });
  });
}

function getLiveStats({ customerId, networkId }) {
  return new Promise((resolve, reject) => {
    const customer = customerService.get.customerId(customerId);
    const openFireConf = config.get('openFire');
    request.get(`${openFireConf.host}/plugins/zangibilling/getstatistic`, {
      qs: {
        prefix: customer.prefix,
        network_id: networkId || ''
      }
    }, (err, httpResponse, result) => {
      if (err) {
        return reject('SIGNALING_NETWORK_ERROR');
      }
      let data;
      try {
        data = JSON.parse(result);
      } catch (e) {
        return reject('SIGNALING_SERVICE_ERROR');
      }

      const stats = {
        voipCallsCount: data.voipCallCount,
        internalCallsCount: data.callCount,
        backTerminatedCallsCount: data.backCallCount,
        onlineUsersCount: data.sessionCount,
      };
      resolve(stats);
    });
  });
}


async function getMessageCountByRegion({ customerId, networkId = null, startDate, endDate }) {
  const sqlParams = networkId ?
    [customerId, networkId, startDate, endDate]
    : [customerId, startDate, endDate];

  const queryPath = networkId ? statsQueries.network.messages.getCountByRegion
    : statsQueries.console.messages.getCountByRegion;

  const recordsQuery = await sql.getDB()
    .query(queryPath, sqlParams);

  return recordsQuery.rows;
}

async function getGroupOrSingleMessageCount(params) {
  const { customerId, networkId = null, regionCode = null, startDate, endDate } = params;

  const sqlParams = networkId ?
    [customerId, networkId, regionCode, startDate, endDate]
    : [customerId, regionCode, startDate, endDate];
  const queryPath = networkId ? statsQueries.network.messages.types.getGroupOrSingleMessageCount
    : statsQueries.console.messages.types.getGroupOrSingleMessageCount;

  const recordsQuery = await sql.getDB()
    .query(queryPath, sqlParams);

  return recordsQuery.rows;
}

async function getGroupOrSingleMessageRecords(params) {
  const { customerId, metricTypeId } = params;
  const { networkId = null, regionCode = null, startDate, endDate } = params;
  const sqlParams = networkId ?
    [customerId, metricTypeId, networkId, regionCode, startDate, endDate]
    : [customerId, metricTypeId, regionCode, startDate, endDate];

  const queryPath = networkId ? statsQueries.network.messages.types.getGroupOrSingleMessageRecords
    : statsQueries.console.messages.types.getGroupOrSingleMessageRecords;

  const recordsQuery = await sql.getDB().query(queryPath, sqlParams);

  return recordsQuery.rows;
}


async function getGroupOrSingleMessageCountByDate(params) {
  const { customerId } = params;
  const { networkId = null, regionCode = null, startDate, endDate } = params;
  const sqlParams = networkId ?
    [customerId, networkId, regionCode, startDate, endDate]
    : [customerId, regionCode, startDate, endDate];

  const queryPath = networkId ? statsQueries.network.messages.getCountByDate
    : statsQueries.console.messages.getCountByDate;

  const recordsQuery = await sql.getDB().query(queryPath, sqlParams);

  return recordsQuery.rows;
}


// Call section


async function getCallCountByRegion(params) {
  const { customerId, metricTypeId, networkId = null, startDate, endDate } = params;
  const sqlParams = networkId ?
    [customerId, metricTypeId, networkId, startDate, endDate]
    : [customerId, metricTypeId, startDate, endDate];
  const queryPath = networkId ? statsQueries.network.calls.getCountByRegion
    : statsQueries.console.calls.getCountByRegion;

  const recordsQuery = await sql.getDB()
    .query(queryPath, sqlParams);

  return recordsQuery.rows;
}

async function getCallMetricTypes() {
  const recordsQuery = await sql.getDB()
    .query(statsQueries.metricTypes.getCallMetricTypes);
  return recordsQuery.rows;
}

async function getCallCountAndDuration(params) {
  const { customerId } = params;
  const { networkId = null, regionCode = null, startDate, endDate } = params;
  const sqlParams = networkId ?
    [customerId, networkId, regionCode, startDate, endDate]
    : [customerId, regionCode, startDate, endDate];

  const queryPath = networkId ? statsQueries.network.calls.getCountByDate
    : statsQueries.console.calls.getCountByDate;

  const recordsQuery = await sql.getDB().query(queryPath, sqlParams);

  return recordsQuery.rows;
}


async function getCountryUsersCounts(params) {
  const client = sql.getDB();

  const { customerId, startDate, endDate } = params;

  const query = {
    sql: statsQueries.console.users.getCountByRegion,
    params: [customerId, startDate, endDate],
  };
  const result = await client.query(query.sql, query.params);
  return result.rows;
}

async function getUsersOverview(params) {
  const client = sql.getDB();

  const { customerId, regionCode = null, startDate, endDate } = params;

  const query = {
    sql: statsQueries.console.users.getOverview,
    params: [customerId, startDate, endDate, regionCode],
  };
  const result = await client.query(query.sql, query.params);
  return result.rows[0];
}

async function getCountsByDate(params) {
  const client = sql.getDB();

  const { customerId, startDate, endDate, regionCode = null } = params;

  const query = {
    sql: statsQueries.console.users.getCountByDate,
    params: [customerId, startDate, endDate, regionCode],
  };
  const result = await client.query(query.sql, query.params);
  return result.rows;
}

async function getPresenceCount(params) {
  const client = sql.getDB();

  const { customerId, firstDay, lastDay, networkId = null } = params;
  const query = {};


  console.log(params)

  if (networkId) {
    query.sql = statsQueries.network.presences.count.presences;
    query.params = [customerId, networkId, firstDay, lastDay];
  } else {
    query.sql = statsQueries.console.presences.count.presences;
    query.params = [customerId, firstDay, lastDay];
  }


  console.log(query.sql)

  const result = await client.query(query.sql, query.params);
  return result.rows[0];
}

async function getPresenceList(params) {
  const client = sql.getDB();

  const { customerId, networkId = null, firstDay, lastDay, limit, offset } = params;
  const query = {};

  if (networkId) {
    query.sql = statsQueries.network.presences.list.presences;
    query.params = [customerId, networkId, firstDay, lastDay, limit, offset];
  } else {
    query.sql = statsQueries.console.presences.list.presences;
    query.params = [customerId, firstDay, lastDay, limit, offset];
  }

  const result = await client.query(query.sql, query.params);
  return result.rows;
}


module.exports = {
  getLiveStats,
  getOnlineUsers,
  messages: {
    getCount: getMessageCountByRegion,
    getCountByDate: getGroupOrSingleMessageCountByDate,
    types: {
      getCount: getGroupOrSingleMessageCount,
      getRecords: getGroupOrSingleMessageRecords
    }
  },
  calls: {
    getCount: getCallCountByRegion,
    getMetricTypes: getCallMetricTypes,
    getCountByDate: getCallCountAndDuration,
  },
  users: {
    countryCounts: getCountryUsersCounts,
    overview: getUsersOverview,
    countsByDate: getCountsByDate
  },
  presences: {
    list: {
      presences: getPresenceList
    },
    count: {
      presences: getPresenceCount
    }
  }
};
