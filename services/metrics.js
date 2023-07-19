/* eslint-disable no-restricted-syntax */
const async = require('async');
const fs = require('fs');
const sql = require('./db');
const customerService = require('./customers');
const { parsePhoneNumber } = require('../helpers/number');

const metricQueries = sql.queries.metrics;
const sqlQueryRaw = fs.readFileSync('sql/workers/metrics/updateMetrics.sql').toString();


const META_TYPES = {
  CALL: {
    ENUM: 'CALL',
    PROPS: {
      START: 'START',
      RINGING: 'RINGING',
      END: 'END',
    }
  },
  MSG: {
    ENUM: 'MSG'
  },
};

const metricTypes = {};

function setMetricType(metricType) {
  const contextTypes = {};
  for (const metricContextType of metricType.metricContextTypes) {
    contextTypes[metricContextType.name] = metricContextType;
  }
  metricType.metricContextTypes = {};
  metricType.metricContextTypes = contextTypes;
  metricTypes[metricType.name] = metricType;
}

function setMetricTypes(types) {
  for (const metricType of types) {
    const contextTypes = {};
    for (const metricContextType of metricType.metricContextTypes) {
      contextTypes[metricContextType.name] = metricContextType;
    }
    metricType.metricContextTypes = {};
    metricType.metricContextTypes = contextTypes;
    metricTypes[metricType.name] = metricType;
  }
}

function getMetricType(name, getId = false) {
  if (getId) {
    const metricType = metricTypes[name];
    return metricType.metricTypeId;
  }
  return metricTypes[name];
}

function hasMetricType(name) {
  return Object.prototype.hasOwnProperty.call(metricTypes, name);
}

function getMetricTypes() {
  return metricTypes;
}

function deleteMetricType(name) {
  delete metricTypes[name];
}

const normalizePacket = (body, callback) => {
  const message = JSON.parse(body);


  if (!message.from) {
    // console.log(message);
    return;
  }


  message.createdAt = new Date(message.time);
  parsePhoneNumber(message.from, true, (err, parsed) => {
    if (err) {
      return callback(err);
    }


    try {
      // Metric type id getter proxy
      const networkId = message.meta ? message.meta.network || null : null;

      // console.log(message.from)
      // if (message.from === 'zz37455909314') {
      //   console.log(message);
      // }

      let metricTypeLabel = '';
      let metricContextTypeLabel = '';
      let duration;
      if (message.group) {
        metricTypeLabel += 'GROUP_';
      }
      if (message.type === META_TYPES.MSG.ENUM) {
        metricTypeLabel += message.type;
        metricContextTypeLabel = message.contextType;
      } else if (message.type === META_TYPES.CALL.ENUM) {
        const meta = message.meta;
        metricTypeLabel = `${message.contextType}_${message.type}`;
        if (meta) {
          metricContextTypeLabel = meta.action;
          if (meta.duration) {
            duration = meta.duration;
            metricTypeLabel = `DURATION_${metricTypeLabel}`;
          }
        }
      }

      const metricType = getMetricType(metricTypeLabel);
      const metricContextType = metricType.metricContextTypes[metricContextTypeLabel];

      // console.log(parsed);
      // console.log(customerService.customers.values);

      const customer = customerService.customers.getValue(parsed.prefix);
      const value = duration || 1;
      const result = {
        phoneNumber: parsed.phoneNumber,
        regionCode: parsed.regionCode,
        networkId,
        metricType,
        metricContextType,
        customer,
        value,
        ...message
      };


      // if (result.regionCode === 'AM' && result.customer.customerId === 1) {
      //   count++;
      //   // console.log(count);
      //
      // }


      callback(null, result);
    } catch (e) {
       console.log(e);
       console.log(message);
    }
  });
};


function updateMetric(callback) {
  const packet = this.packet;

  const sqlQuery = {
    params: [
      packet.customer.customerId,
      packet.metricType.metricTypeId,
      packet.metricContextType.metricContextTypeId,
      packet.from,
      packet.regionCode,
      packet.createdAt,
      packet.networkId,
      packet.value
    ],
    raw: sqlQueryRaw
  };

    // console.log(sqlQuery.params);

  sql.getDB().query(sqlQuery.raw, sqlQuery.params)
    .then((res) => {
      const updatedMetrics = res.rows[0];

      // if (packet.from === 'zz37455909314') {
      // console.log(updatedMetrics);
      //
      // }


      if (res.rowCount > 0) {
        callback(null, updatedMetrics);
      } else {
        callback('SQL_QUERY_ERROR', null);
      }
    })
    .catch((e) => {
      console.log(e);
      // if (packet.networkId) {
      //   console.log(sqlQuery.params);
      // }
      // console.log('### sqlQuery ###');
      // console.log(sqlQuery);
      // console.log(sqlQuery.params);
      callback('DB_ERROR', null);
    });
}


function handleMetricMessage(message, callback) {
  normalizePacket(message, (err, packet) => {
    if (err) {
      return callback({ errorMessage: 'NORMALIZE_STRING_ERROR', error: err });
    }
    const parallelWorker = {};

    if (packet.meta && packet.meta.duration) {
      parallelWorker
        .updateDurationMetric = updateMetric.bind({ packet });
    } else {
      parallelWorker.updateMetric = updateMetric.bind({ packet });
    }
    async.parallel(parallelWorker, (err, results) => {
      if (err) {
        return callback({ errorMessage: 'METRIC_UPDATE_ERROR', error: err });
      }
      callback(null, results);
    });
  });
}


async function getMetricValues(metricParams) {
  const {
    customerId,
    startDate,
    endDate,
    regionCode,
    metricTypeId,
    metricContextTypeId,
    limit,
    offset
  } = metricParams;

  const recordsQuery = sql.getDB().query(metricQueries.getMetricValues.records,
    [
      customerId, startDate, endDate, regionCode,
      metricTypeId, metricContextTypeId, limit, offset
    ]);
  const countQuery = sql.getDB().query(metricQueries.getMetricValues.count,
    [
      customerId, startDate, endDate, regionCode,
      metricTypeId, metricContextTypeId
    ]);

  const [recordsQueryResult, countQueryResult] = await Promise.all([recordsQuery, countQuery]);

  return {
    records: recordsQueryResult.rows,
    count: countQueryResult.rows[0].count,
  };
}


async function getCountryMetrics(params) {
  const {
    customerId,
    metricTypeId,
    metricContextTypeId,
    startDate,
    endDate,
  } = params;

  const recordsQueryResult = await sql.getDB().query(metricQueries.countries.values, [
    customerId, metricTypeId, metricContextTypeId, startDate, endDate
  ]);
  return {
    records: recordsQueryResult.rows
  };
}

async function getChartValuesCountryMetrics(params) {
  const {
    customerId,
    metricTypeId,
    metricContextTypeId,
    startDate,
    endDate,
  } = params;

  const recordsQueryResult = await sql.getDB().query(metricQueries.countries.chartValues, [
    customerId, metricTypeId, metricContextTypeId, startDate, endDate
  ]);
  return {
    records: recordsQueryResult.rows
  };
}


async function getMetricsByCountry(params) {
  const {
    customerId,
    startDate,
    endDate,
    metricTypeId,
    regionId,
  } = params;

  const recordsQueryResult = await sql.getDB().query(metricQueries.countries.value, [
    customerId, regionId, metricTypeId, startDate, endDate
  ]);
  return {
    records: recordsQueryResult.rows
  };
}


function normalizeDate(timestamp) {
  const date = new Date(timestamp);
  return [date.getFullYear(), date.getMonth() + 1, date.getDate()].join('-');
}


async function updateUserPresence(db, {
  metrics, instances,
  networkMetrics, networkMetricInstances
}) {
  // console.log(networkMetrics);
  // console.log(networkMetricInstances);
  const client = db || sql.getDB();
  try {
    const q = await Promise.all([
      client.query('SELECT metrics."updatePresenceInstances"($1, $2);', [metrics, instances]),
      client.query('SELECT metrics."updateNetworkPresenceInstances"($1, $2);', [networkMetrics, networkMetricInstances]),
    ]);

    console.log(q);
  } catch (e) {
    console.error(metrics);
    console.error(instances);
    console.error(networkMetrics);
    console.error(networkMetricInstances);
    console.error(e);
    throw new Error('MAU handle error');
  }
}


function getUserPresence(instances, isNetwork = false) {
  const customerTempMetrics = {};
  const metrics = [];
  const presenceInstances = [];

  for (const instance of instances) {
    let networkId;
    if (isNetwork) {
      if (!instance.meta || !instance.meta.network) {
        // eslint-disable-next-line no-continue
        continue;
      } else {
        networkId = instance.meta.network;
      }
    }

    try {
      const customer = customerService.customers.getValue(instance.prefix);


      if (!customer) {
        console.log(instance.prefix);
      }

      if (customer && customer.customerId) {
        const customerId = customer.customerId;
        const date = normalizeDate(instance.createdAt);

        if (!customerTempMetrics[customerId]) {
          customerTempMetrics[customerId] = {
            customerId,
            dates: {}
          };
          customerTempMetrics[customerId].dates[date] = {
            customerId,
            date,
            count: 0
          };
        }

        if (customerTempMetrics[customerId] &&
                    !customerTempMetrics[customerId].dates[date]) {
          customerTempMetrics[customerId].dates[date] = {
            customerId,
            date,
            count: 0
          };
        }

        customerTempMetrics[customerId].dates[date].customerId = customerId;
        customerTempMetrics[customerId].dates[date].count += 1;

        const number = instance.username.replace(instance.prefix, '');

        const presenceInstance = {
          customerId,
          date,
          number
        };
        if (networkId) {
          customerTempMetrics[customerId].dates[date].networkId = networkId;
          presenceInstance.networkId = networkId;
        }
        presenceInstances.push(presenceInstance);
      } else {
        // console.log(instances);
      }
    } catch (e) {
      console.log(e);
    }
  }

  for (const customerId in customerTempMetrics) {
    if (Object.prototype.hasOwnProperty.call(customerTempMetrics, customerId)) {
      const customerTempMetric = customerTempMetrics[customerId];
      metrics.push(...Object.values(customerTempMetric.dates));
    }
  }
  return {
    metrics,
    presenceInstances
  };
}

async function handleUserPresence(message) {
  const instances = JSON.parse(message);

  if (!Array.isArray(instances)) {
    throw new Error('invalid instances');
  }
  const presence = getUserPresence(instances);
  const networkPresence = getUserPresence(instances, true);
  try {
    await updateUserPresence(null, {
      metrics: JSON.stringify(presence.metrics),
      instances: JSON.stringify(presence.presenceInstances),
      networkMetrics: JSON.stringify(networkPresence.metrics),
      networkMetricInstances: JSON.stringify(networkPresence.presenceInstances),
    });
  } catch (e) {
    console.log(e);
    console.log(JSON.stringify(presence));
    console.log(JSON.stringify(networkPresence));
    throw new Error('invalid data');
  }
}


module.exports = {
  updateMetric,
  handle: {
    userPresence: handleUserPresence
  },
  metricTypes: {
    setMetricTypes,
    set: setMetricType,
    get: getMetricType,
    getAll: getMetricTypes,
    delete: deleteMetricType,
    hasType: hasMetricType
  },
  handleMetricMessage,
  // emit,
  CONSTANTS: META_TYPES,
  // workers
  getMetricValues,
  countries: {
    getCountryMetrics,
    getChartValuesCountryMetrics,
    getMetricsByCountry
  }
};
