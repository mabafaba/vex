// libraries
const express = require('express');
const cookieParser = require('cookie-parser');
const userService = require('./services/users');
const jwt = require('jsonwebtoken');
const path = require('path');

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

const io = require('./services/utils/io')(server);
// Initialize socket.io with more permissive CORS to fix connection issues

const reactionsService = require('./services/reactions');
const vertexService = require('./services/vertex');

const administrativeLevelsService = require('./services/administrativelevels').router;

const { authorize, authenticate } = require('./authorizations');

// WebSocket authentication middleware
const authenticateSocket = async (socket, next) => {
  next();
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

    const userData = await userService.User.findById(decoded.id);
    // Attach user info to socket
    socket.user = {
      id: decoded.id,
      name: decoded.username,
      role: decoded.role,
      location: userData.data.administrativeBoundaries
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

// PWA static files
app.use('/vex/icons', express.static('icons'));
app.use(express.static('.', {
  index: false,
  setHeaders: (res, path) => {
    if (path.endsWith('sw.js')) {
      res.setHeader('Service-Worker-Allowed', '/');
      res.setHeader('Cache-Control', 'no-cache');
    }
  }
}));

// Livereload setup

// Serve static files from utils directory
app.use('/vex/utils', express.static('services/utils'));

// Serve administrative levels service
app.use('/vex/administrative', administrativeLevelsService);

// Serve livemodelelement directory as static for client-side imports
app.use('/vex/services/livemodelelement', express.static(__dirname + '/services/livemodelelement'));

app.use('/vex/reactions', authenticate, reactionsService.router);

app.use('/vex/vertex', authenticate, authorize, vertexService.router);

// on logout, end all socket interactions
app.get('/vex/user/logout', authenticate, (req, res, next) => {
  if (!req.user) {
    return next();
  }
  // Clear the JWT cookie
  res.clearCookie('jwt');

  // Disconnect all sockets for the user
  const sockets = io.sockets.sockets;
  sockets.forEach((socket) => {
    if (socket.user && socket.user.id.toString() === req.user.id.toString()) {
      socket.disconnect(true);
    }
  });
  next();
});

app.use('/vex/user', authenticate, authorize, userService.app);

// PWA routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'services/vertex/client/test.html'));
});

app.get('/manifest.json', (req, res) => {
  res.sendFile(path.join(__dirname, 'manifest.json'));
});

app.get('/sw.js', (req, res) => {
  res.setHeader('Service-Worker-Allowed', '/');
  res.setHeader('Cache-Control', 'no-cache');
  res.sendFile(path.join(__dirname, 'sw.js'));
});

// Socket.io connection handling
io.on('connection', (socket) => {
  // Join a room for a specific vex thread
  socket.on('joinVexRoom', (vexId) => {
    // Only allow authenticated users to join rooms

    if (!socket.user) {
      socket.emit('error', { message: 'Not authenticated' });
      return;
    }
    if (!socket.user.location) {
      socket.emit('error', { message: 'No location found' });
      return;
    }

    console.log('accessing location', socket.user.location);

    // room id is vex-${vexId}-location-${location}
    // join each location
    socket.user.location.forEach((location) => {
      console.log('location', location);
      console.log('joining room', `vex-${vexId}-location-${location._id}`);
      socket.join(`vex-${vexId}-location-${location._id}`);
    });
  });

  // Leave a room when no longer viewing the thread
  socket.on('leaveVexRoom', (vexId) => {
    if (!socket.user) {
      return;
    }
    if (!socket.user.location) {
      return;
    }
    // leave each location
    socket.user.location.forEach((location) => {
      socket.leave(`vex-${vexId}-location-${location._id}`);
    });
  });

  socket.on('disconnect', () => {
    // Handle disconnection
    // leave each location
    if (!socket.user) {
      return;
    }
    if (!socket.user.location) {
      return;
    }
    socket.user.location.forEach((location) => {
      socket.leave(`vex-${socket.user.id}-location-${location._id}`);
    });
  });
});

server.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});
