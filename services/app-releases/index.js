const request = require('request');
const config = require('config');
const customerService = require('../customers');
const sql = require('../db');

const appReleasesQueries = require('../../sql/app-releases');

const openFireConf = config.get('openFire');

async function getAppReleases(db, { customerId, limit, offset }) {
  const client = db || sql.getDB();
  const query = await client
    .query(appReleasesQueries.list.appReleases, [customerId, limit, offset]);
  return query.rows;
}

async function getAppReleasesCount(db, { customerId }) {
  const client = db || sql.getDB();
  const query = await client
    .query(appReleasesQueries.count.appReleases, [customerId]);
  return query.rows[0] ? +query.rows[0].count : 0;
}


async function createAppRelease(db, { customerId, platformId, version }) {
  const client = db || sql.getDB();
  const query = {
    sql: appReleasesQueries.create.appRelease,
    params: [customerId, platformId, version],
  };
  const result = await client.query(query.sql, query.params);
  return result.rows[0];
}

async function updateAppRelease(db, { customerId, appReleaseId, platformId, version }) {
  const client = db || sql.getDB();
  const query = {
    sql: appReleasesQueries.update.appRelease,
    params: [customerId, appReleaseId, platformId, version],
  };
  const result = await client.query(query.sql, query.params);
  return result.rows[0];
}

async function getAppRelease(db, { customerId, appReleaseId }) {
  const client = db || sql.getDB();
  const query = {
    sql: appReleasesQueries.retrieve.appRelease,
    params: [customerId, appReleaseId],
  };
  const result = await client.query(query.sql, query.params);
  return result.rows[0];
}


async function deleteAppRelease(db, { customerId, appReleaseId }) {
  const client = db || sql.getDB();
  const query = {
    sql: appReleasesQueries.delete.appRelease,
    params: [customerId, appReleaseId],
  };
  const result = await client.query(query.sql, query.params);
  return result.rowCount > 0;
}

async function upsertAppReleaseLang(db, { customerId, appReleaseId, langId, title, description }) {
  const client = db || sql.getDB();
  const query = {
    sql: appReleasesQueries.upsert.appReleaseLang,
    params: [customerId, appReleaseId, langId, title, description],
  };
  const result = await client.query(query.sql, query.params);
  return result.rows[0];
}


async function retrieveAppReleaseLang(db, { customerId, appReleaseId, langId }) {
  const client = db || sql.getDB();
  const query = {
    sql: appReleasesQueries.retrieve.appReleaseLang,
    params: [customerId, appReleaseId, langId],
  };
  const result = await client.query(query.sql, query.params);
  return result.rows[0] || { isEmpty: true };
}

async function createBroadcast({ customerId, appReleaseId }) {
  const appRelease = await getAppRelease(null, { customerId, appReleaseId });

  const { prefix } = customerService.get.customerId(customerId);

  const platformId = +appRelease.platformId;
  const version = appRelease.version;
  const requestUrl = `${openFireConf.host}/plugins/versioning/schedule-update-notifier`;

  const makeRequest = new Promise((resolve, reject) => {
    request.post(requestUrl, {
      json: { prefix, platformId, version }
    }, (err, httpResponse, result) => {
      if (err) {
        return reject(err);
      }
      if (result.err) {
        return reject(result);
      }
      resolve(result);
    });
  });
  await makeRequest;
}


module.exports = {
  list: {
    appReleases: getAppReleases,
  },
  create: {
    appRelease: createAppRelease,
    broadcast: createBroadcast
  },
  count: {
    appReleases: getAppReleasesCount
  },
  delete: {
    appRelease: deleteAppRelease
  },
  retrieve: {
    appRelease: getAppRelease,
    appReleaseLang: retrieveAppReleaseLang,
  },
  update: {
    appRelease: updateAppRelease
  },
  upsert: {
    appReleaseLang: upsertAppReleaseLang
  }
};
