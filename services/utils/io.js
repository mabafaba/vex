const socketIo = require('socket.io');
let ioInstance = false;
function io (server) {
  if (ioInstance) {
    return ioInstance;
  }
  if (server && ioInstance === false) {
    ioInstance = socketIo(server, {
      cors: {
        origin: '*', // Allow all origins
        methods: ['GET', 'POST'],
        credentials: true,
        allowedHeaders: ['Content-Type', 'Authorization']
      },
      path: '/socket.io', // Make sure path matches client expectations
      transports: ['websocket', 'polling'] // Support multiple transport methods
    });
    return ioInstance;
  }
  throw new Error('Socket.IO instance has not been set.');
}

module.exports = io;
