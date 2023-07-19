const express = require('express');
const v1 = require('./v1');
const v2 = require('./v2');
const v3 = require('./v3');
const services = require('./services');
const channels = require('./channels');
const networks = require('./networks');
const hub = require('./hub');
const sockets = require('./sockets');

const router = express.Router();

module.exports = (io) => {
  router.get('/', (req, res) => res.json({ reply: 'pong' }));

  // HTTP API
  router.use('/v1', v1);
  router.use('/v2', v2);
  router.use('/v3', v3);

  // HTTP API for channel module and business console
  router.use('/channels', channels);

  // HTTP API for network module and business console
  router.use('/networks', networks);

  // HTTP API for supporting our external services
  router.use('/', services);


  // HTTP api for external requests (deprecated)
  router.use('/hub', hub);

  // WebSockets API
  sockets(io);

  return router;
};
