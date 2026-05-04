const { Server } = require('socket.io');
const socketAuth = require('../middleware/socketAuth');

let io;

const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  io.use(socketAuth);

  io.on('connection', (socket) => {
    const { id, role } = socket.user;
    console.log(`Socket connected: ${socket.id} user=${id} role=${role}`);

    socket.join(id);
    console.log(`Socket ${socket.id} joined room: ${id}`);

    if (role === 'admin') {
      socket.join('admins');
      console.log(`Socket ${socket.id} joined room: admins`);
    }

    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });

  return io;
};

const getIo = () => {
  if (!io) {
    throw new Error('Socket.io has not been initialized yet');
  }
  return io;
};

const emitToUser = (userId, event, data) => {
  const socketServer = getIo();
  console.log(`Emitting event '${event}' to user room: ${userId}`);
  socketServer.to(userId).emit(event, data);
};

const emitToAdmins = (event, data) => {
  const socketServer = getIo();
  console.log(`Emitting event '${event}' to admins room`);
  socketServer.to('admins').emit(event, data);
};

module.exports = { initSocket, getIo, emitToUser, emitToAdmins };
