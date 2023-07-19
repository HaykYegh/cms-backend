const config = require('config');
const jwt = require('jsonwebtoken');
const utils = require('../../helpers/utils');
const networkEmitter = require('../../services/sockets/emitters/networks');


module.exports = (io) => {
  const { networkSocket } = io;

  networkSocket.on('error', e => console.log(e));

  networkSocket.use((socket, next) => {
    const handshake = socket.handshake;

    if (!handshake) {
      return next(new Error('INVALID_TOKEN'));
    }


    const cookie = utils.parseCookie(handshake.headers.cookie);

    if (!cookie || !cookie.authentication) {
      return next(new Error('NOT_AUTHORIZED'));
    }

    jwt.verify(cookie.authentication, config.get('jsonWebToken.secret'), (err, admin) => {
      if (err) {
        return next(new Error('INVALID_TOKEN'));
      }

      const networkId = handshake.query.networkId;

      if (admin) {
        if (!admin.customer) {
          return next(new Error('INVALID_CUSTOMER'));
        }
        if (!admin.network) {
          return next(new Error('INVALID_NETWORK'));
        }
        if (+networkId !== admin.network.networkId) {
          return next(new Error('INVALID_ACCESS_CREDENTIALS'));
        }
        socket.adminId = admin.administratorId.toString();
        socket.customerId = admin.customer.customerId.toString();
        socket.networkId = admin.network.networkId.toString();

        return next();
      }
      return next(new Error('INVALID_ADMIN'));
    });
  });


  networkSocket.on('connection', ((socket) => {
    socket.join(socket.networkId);

    networkEmitter.state(socket.networkId);


    // socket.on('get', (data, ack) => {
    //   executeRequest('get', data, socket, ack);
    // });
    //
    // socket.on('post', (data, ack) => {
    //   executeRequest('post', data, socket, ack);
    // });

    socket.on('disconnect', () => {

    });
  }));
};
