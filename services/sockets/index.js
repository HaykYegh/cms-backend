const redisAdapter = require('socket.io-redis');
const socketIO = require('socket.io');
const config = require('config');

let io = null;

const connect = () => {
  const io = socketIO({
    serveClient: false,
    transports: ['websocket'],
    cookie: true,
    pingTimeout: 10000,
    pingInterval: 10000,
    perMessageDeflate: false
  });
  io.adapter(redisAdapter(config.get('redis')));
  return io;
};

function getSocketIO() {
  if (!io) {
    io = connect();
  }
  const network = io.of('/network');
  const console = io.of('/console');

  return {
    socket: io,
    networkSocket: network,
    consoleSocket: console,
  };
}


module.exports = {
  getIO: getSocketIO
};
