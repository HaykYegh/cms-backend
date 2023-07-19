/* eslint-disable no-restricted-syntax */
/**
 * Module dependencies.
 */

const app = require('../app');
const http = require('http');
const async = require('async');
const customerService = require('../services/customers');
const fs = require('fs');
const sql = require('../services/db').getDB();
const sqlQueries = require('../services/db').queries;
const workerService = require('../services/workers');

/**
 * Normalize a port into a number, string, or false.
 */

function normalizePort(val) {
  const port = parseInt(val, 10);

  if (isNaN(port)) {
    // named pipe
    return val;
  }

  if (port >= 0) {
    // port number
    return port;
  }

  return false;
}

/**
 * Get port from environment and store in Express.
 */

const port = normalizePort(process.env.PORT || '3001');
app.set('port', port);


/**
 * Event listener for HTTP server "error" event.
 */

function onError(error) {
  if (error.syscall !== 'listen') {
    throw error;
  }

  const bind = typeof port === 'string'
    ? `Pipe ${port}`
    : `Port ${port}`;

  // handle specific listen errors with friendly messages.json
  switch (error.code) {
    case 'EACCES':
      console.error(`${bind} requires elevated privileges`);
      process.exit(1);
      break;
    case 'EADDRINUSE':
      console.error(`${bind} is already in use`);
      process.exit(1);
      break;
    default:
      throw error;
  }
}

/**
 * Create HTTP server.
 */

const server = http.createServer(app);

/**
 * Create Socket server.
 */

const io = app.io.socket;

io.attach(server, {
  transports: ['websocket'],
  cookie: true,
  pingTimeout: 10000,
  pingInterval: 10000,
  perMessageDeflate: false
});

/**
 * Event listener for HTTP server "listening" event.
 */

function onListening() {
  const addr = server.address();
  console.log(`NODE_ENV=${process.env.NODE_ENV}`);
  console.log(`PIPE=${JSON.stringify(addr)}`);
  console.log(`CUSTOMERS=${JSON.stringify(customerService.customers.getPrefixValues())}`);
}

/**
 * Listen on provided port, on all network interfaces.
 */

async.parallel({
  customerIds(callback) {
    sql.query(sqlQueries.customers.get.ids)
      .then((res) => {
        const customerIds = {};
        for (const customer of res.rows) {
          customerIds[customer.customerId] = customer;
        }
        callback(null, customerIds);
      })
      .catch((e) => {
        console.error('ERR - customers');
        console.error(e);
        callback(e, null);
      });
  },
  customers(callback) {
    const sqlRaw = fs.readFileSync('sql/customers/getCustomers.sql').toString();
    sql.query(sqlRaw)
      .then((res) => {
        callback(null, res.rows);
      })
      .catch((e) => {
        console.error('ERR - customers');
        console.error(e);
        callback(e, null);
      });
  },
  metricTypes(callback) {
    const sqlRaw = fs.readFileSync('sql/metrics/get-metric-types.sql').toString();
    sql.query(sqlRaw)
      .then((res) => {
        callback(null, res.rows);
      })
      .catch((e) => {
        console.error('ERR - metricTypes');
        console.error(e);


        callback(e, null);
      });
  }

}, (err, results) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }
  workerService.init(results);
  server.listen(port);
  server.on('error', onError);
  server.on('listening', onListening);
});
