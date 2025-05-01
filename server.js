// libraries
const express = require('express');
const cookieParser = require('cookie-parser');
const userService = require('./services/users');
const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');

// services
const connectDB = require('./services/database');

connectDB('vex')
  .then(() => {
    console.log('Connected to MongoDB');
  })
  .catch((err) => {
    console.error('Error connecting to MongoDB', err);
  });

const port = 3005;
const app = express();
const server = require('http').createServer(app);

const vertexService = require('./services/vertex');
const geodataService = require('./services/geodata');

// Initialize socket.io with more permissive CORS to fix connection issues
const io = socketIo(server, {
  cors: {
    origin: '*', // Allow all origins
    methods: ['GET', 'POST'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization']
  },
  path: '/socket.io', // Make sure path matches client expectations
  transports: ['websocket', 'polling'] // Support multiple transport methods
});
const { authorize, authenticate } = require('./authorizations');

// WebSocket authentication middleware
const authenticateSocket = async (socket, next) => {
  try {
    // Get token from handshake
    const token =
      socket.handshake.auth?.token ||
      socket.handshake.headers?.authorization?.split(' ')[1] ||
      socket.handshake.headers?.cookie
        ?.split(';')
        .find((c) => c.trim().startsWith('jwt='))
        ?.split('=')[1];

    if (!token) {
      return next(new Error('Authentication error: Token not provided'));
    }

    // Verify token using the same secret as HTTP auth
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Attach user info to socket
    socket.user = {
      id: decoded.id,
      name: decoded.username,
      role: decoded.role
    };

    next();
  } catch (err) {
    next(new Error('Authentication error: ' + err.message));
  }
};

// Apply authentication middleware to all connections
io.use(authenticateSocket);

app.use(cookieParser());
app.use(express.json());

// Serve static files from utils directory
app.use('/vex/utils', express.static('services/utils'));

app.use('/vex/vertex', authenticate, authorize, vertexService.router);

// on logout, end all socket interactions
app.get('/vex/user/logout', authenticate, (req, res, next) => {
  console.log('Logout request received, removing from sockets');
  if (!req.user) {
    console.log('No user found, skipping socket disconnection');

    return next();
  }
  // Clear the JWT cookie
  res.clearCookie('jwt');

  // Disconnect all sockets for the user
  const sockets = io.sockets.sockets;
  console.log('Sockets connected', sockets);
  sockets.forEach((socket) => {
    console.log('Disconnecting socket', socket.id);
    console.log('Socket user', socket.user.id);
    console.log('Request user', req.user);

    if (socket.user && socket.user.id.toString() === req.user.id.toString()) {
      socket.disconnect(true);
    }
  });
  next();
});

app.use('/vex/user', authenticate, authorize, userService.app);

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('New client connected', socket.id, 'as user:', socket.user?.name);

  // Join a room for a specific vex thread
  socket.on('joinVexRoom', (vexId) => {
    // Only allow authenticated users to join rooms
    if (!socket.user) {
      socket.emit('error', { message: 'Not authenticated' });
      return;
    }
    socket.join(`vex-${vexId}`);
    console.log(
      `Client ${socket.id} (${socket.user.name}) joined room: vex-${vexId}`
    );
  });

  // Leave a room when no longer viewing the thread
  socket.on('leaveVexRoom', (vexId) => {
    socket.leave(`vex-${vexId}`);
    console.log(
      `Client ${socket.id} (${socket.user?.name}) left room: vex-${vexId}`
    );
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected', socket.id, 'user:', socket.user?.name);
  });
});

// Make io accessible to other modules
app.set('io', io);

server.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
  console.log(`Socket.io server listening on port ${port}`);
});
