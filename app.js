require('events').EventEmitter.prototype._maxListeners = 100;

const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const querybox = require('querybox');
const cookieParser = require('cookie-parser');
const pg = require('pg');
const query = require('pg-query');
const config = require('config');
const cors = require('cors');
const async = require('async');
const _ = require('lodash');
const moment = require('moment-timezone');
const validator = require('./middlewares/validator');
const socketService = require('./services/sockets');
const logger = require('./services/logger');


moment.tz.setDefault('UTC');

const app = express();

app.disable('etag');
app.disable('x-powered-by');
app.disable('graceful-exit');
app.disable('views');

query.pg = pg;
query.connectionParameters = {
  host: config.get('postgres.host'),
  port: config.get('postgres.port'),
  database: config.get('postgres.database'),
  user: config.get('postgres.user'),
  password: config.get('postgres.password'),
  ssl: config.get('postgres.ssl')
};

pg.defaults.poolSize = config.get('postgres.poolSize');
query.pg = pg;
const sql = querybox(path.join(__dirname, '/sql'), query);

pg.on('error', (e) => {
  logger.error(e);
});

global.appRoot = path.resolve(__dirname);
global.async = async;
global._ = _;
global.sql = sql;
global.log = logger;
global.query = query;

global.__base = path.join(__dirname);
global.__import = name => require(path.join(__dirname, name));

app.use(cors({
  origin: config.get('app.system.cors'),
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['X-Access-Id', 'X-Access-Token', 'X-Access-Prefix', 'Content-Type', 'Access-Control-Allow-Credentials'],
  exposedHeaders: ['X-Access-Id', 'X-Access-Token', 'X-Access-Prefix'],
  credentials: true
}));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());

app.use(validator);


const io = socketService.getIO();
app.use('/', require('./controllers')(io));

app.use((req, res) => {
  res.status(404);
  res.json({
    err: true,
    err_msg: 'NOT_FOUND',
  });
});

app.use((err, req, res) => {
  res.status(err.status || 500);
  res.json({
    err: true,
    err_msg: err.message,
  });
});

app.io = io;
module.exports = app;
