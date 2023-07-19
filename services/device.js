/* eslint-disable no-restricted-syntax,no-await-in-loop */
const chunk = require('lodash/chunk');
const sql = require('./db');
const logger = require('./logger');
const redis = require('./redis');

const { promisify } = require('util');

const hgetAsync = promisify(redis.getCache().hget).bind(redis.getCache());

const { devices } = sql.queries;

const getNotSpecified = async (client, { customerId }) => {
  const db = client || sql.getDB();
  const query = await db.query(devices.get.notSpecified.platforms, [customerId]);
  return query.rows;
};
const getDeviceFromCache = async ({ username, accessToken }) => {
  const device = await hgetAsync(username, accessToken);
  return JSON.parse(device);
};

const getDeviceFromCacheBulk = async (devices) => {
  const deviceChunks = chunk(devices, 1000);
  let cachedDevices = [];
  const deviceChunksCount = deviceChunks.length;
  let processedChunkCount = 0;

  for (const chunk of deviceChunks) {
    const promises = chunk
      .filter(device => device && device.username && device.accessToken)
      .map(device => getDeviceFromCache({
        username: `${device.username}_push`,
        accessToken: device.accessToken
      }));
    const chunksOfCachedDevice = await Promise.all(promises);
    const cleanedDeviceList = chunksOfCachedDevice
      .filter(device => device !== null);
    processedChunkCount++;
    cachedDevices = [...cleanedDeviceList, ...cachedDevices];

    console.log((processedChunkCount / deviceChunksCount) * 100);
  }

  return cachedDevices;
};

const migrateChunk = async (devices) => {
  // logger.info(`> Devices is available = ${!!devices}`);
  const client = await sql.getDB().connect();
  // logger.info('> Client connected');

  let chunkResult;

  try {
    await client.query('BEGIN');
    // logger.info('> Transaction began');

    const devicePlatforms = devices
      .map(device => ({
        platformId: !device.platform || device.platform.platformId === 5 ? 6 :
          device.platform.platformId,
        accessToken: device.userToken,
        userId: device.userId
      }));


    const query = await client
      .query(sql.queries.devices.migrate.notSpecified.platforms, [JSON.stringify(devicePlatforms)]);

    chunkResult = query.rows;

    // await client.query('ROLLBACK');

    await client.query('COMMIT');
  } catch (e) {
    logger.error(e);
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }

  return chunkResult;
};

const migrateNotSpecified = async ({ customerId }) => {
  logger.info(`> customerId: ${customerId}}`);

  const notSpecifiedDevices = await getNotSpecified(null, { customerId });
  logger.info(`Not specified Devices count =${notSpecifiedDevices.length}`);


  // put in chunk maker function
  // const cachedDevicesPromises = notSpecifiedDevices
  //   .map(device => getDeviceFromCache({
  //     username: `${device.username}_push`,
  //     accessToken: device.accessToken
  //   }));
  // logger.info(`cachedDevicesPromises count =${cachedDevicesPromises.length}`);
  //
  // const cachedDevicesUnfiltered = await Promise.all(cachedDevicesPromises);
  // logger.info(`cachedDevicesUnfiltered count =${cachedDevicesUnfiltered.length}`);
  //
  // const cachedDevicesFiltered = cachedDevicesUnfiltered.filter(device => device !== null);
  // logger.info(`cachedDevicesFiltered count =${cachedDevicesFiltered.length}`);
  // end


  const cachedDevicesFiltered = await getDeviceFromCacheBulk(notSpecifiedDevices);


  const deviceChunks = chunk(cachedDevicesFiltered, 10000);
  logger.info(`deviceChunks count =${cachedDevicesFiltered.length}`);

  const migrationPromises = deviceChunks.map(chunk => migrateChunk(chunk));
  logger.info(`migrationPromises count =${migrationPromises.length}`);


  const migrationResults = await Promise.all(migrationPromises);
  logger.info(`migrationResults count =${migrationResults.length}`);

  return { affected: migrationResults.length };
};

module.exports = {
  migrate: {
    notSpecified: migrateNotSpecified
  }
};
