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
const remotetouchService = require('./services/remotetouch');
const actionsService = require('./services/actions');

const administrativeLevelsService = require('./services/administrativelevels').router;

const { authorize, authenticate } = require('./authorizations');

// WebSocket authentication middleware
const authenticateSocket = async (socket, next) => {
  // Skip authentication for remotetouch connections
  if (socket.handshake.query?.skipAuth === 'true') {
    return next();
  }

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

// Apply higher limit for actions and groups routes (for image uploads)
app.use('/vex/actions', express.json({ limit: '12mb' }));
app.use('/vex/groups', express.json({ limit: '12mb' }));
app.use('/vex/places', express.json({ limit: '12mb' }));

// Default limit for other routes
app.use(express.json());

// ...
// PWA static files
app.use('/vex/icons', express.static('icons'));

app.use('/vex', express.static('.', {
  index: false,
  setHeaders: (res, path) => {
    if (path.endsWith('sw.js')) {
      res.setHeader('Service-Worker-Allowed', '/vex/');
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

app.use('/vex/remotetouch', remotetouchService.router);

app.use('/vex/actions', authenticate, actionsService.actionRouter);
app.use('/vex/groups', authenticate, actionsService.groupRouter);
app.use('/vex/places', authenticate, actionsService.placeRouter);

// Serve actions service UI
app.get('/vex/actions-ui', authenticate, (req, res) => {
  res.sendFile(path.join(__dirname, 'services/actions/client/index.html'));
});

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

// PWA routes - serve main app at /vex
app.get('/vex', (req, res) => {
  res.sendFile(path.join(__dirname, 'services/vertex/client/index.html'));
});

app.get('/vex/', (req, res) => {
  res.sendFile(path.join(__dirname, 'services/vertex/client/index.html'));
});

app.get('/vex/manifest.json', (req, res) => {
  res.sendFile(path.join(__dirname, 'manifest.json'));
});

app.get('/vex/sw.js', (req, res) => {
  res.setHeader('Service-Worker-Allowed', '/vex/');
  res.setHeader('Cache-Control', 'no-cache');
  res.sendFile(path.join(__dirname, 'sw.js'));
});

// Redirect root to /vex for convenience
app.get('/', (req, res) => {
  res.redirect('/vex');
});

// Socket.io connection handling
io.on('connection',  (socket) => {
  // Remote Touch functionality
  socket.on('join-remotetouch', () => {
    socket.join('remotetouch-room');

    // Get all clients in the remotetouch room
    const room = io.sockets.adapter.rooms.get('remotetouch-room');
    const clients = {};

    if (room) {
      for (const socketId of room) {
        const clientSocket = io.sockets.sockets.get(socketId);
        if (clientSocket) {
          clients[socketId] = {
            id: socketId,
            hovering: false,
            hoveredIndex: -1
          };
        }
      }
    }

    // Send updated client list to all clients in the room
    io.to('remotetouch-room').emit('remotetouch-clients', { clients });
  });

  socket.on('remotetouch-hover', (data) => {
    // Update hover state and broadcast to all clients in the room
    socket.to('remotetouch-room').emit('remotetouch-hover', {
      clientId: socket.id,
      hovering: data.hovering,
      hoveredIndex: data.hoveredIndex,
      hoveredClientId: data.hoveredClientId
    });
  });

  // Join a room for a specific vex thread
  socket.on('joinVexRoom', async (vexId) => {
    // Only allow authenticated users to join rooms
    console.log('joining vex room received on server', vexId);
    if (!socket.user) {
      socket.emit('error', { message: 'Not authenticated' });
      return;
    }
    if (!socket.user.location) {
      socket.emit('error', { message: 'No location found' });
      return;
    }

    // update user location
    const userData = await userService.User.findById(socket.user.id);
    socket.user.location = userData.data.administrativeBoundaries;

    // room id is vex-${vexId}-location-${location}
    // join each location
    socket.user.location.forEach(async (location) => {
      //console.log('joining room', `vex-${vexId}-location-${location._id}`, location.properties.name);
      const vex = await vertexService.Vertex.findById(vexId);

      console.log('subscribing', vex.content, ' - ', location.properties.name);
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
    socket.user.location.forEach(async (location) => {
      const vex = await vertexService.Vertex.findById(vexId);
      console.log('unsubscribing', vex.content, ' - ', location.properties.name);
      socket.leave(`vex-${vexId}-location-${location._id}`);
    });
  });

  socket.on('disconnect', () => {
    // Handle remotetouch disconnection
    const remotetouchRoom = io.sockets.adapter.rooms.get('remotetouch-room');
    if (remotetouchRoom) {
      const clients = {};
      for (const socketId of remotetouchRoom) {
        const clientSocket = io.sockets.sockets.get(socketId);
        if (clientSocket) {
          clients[socketId] = {
            id: socketId,
            hovering: false,
            hoveredIndex: -1
          };
        }
      }
      // Send updated client list to remaining clients
      io.to('remotetouch-room').emit('remotetouch-clients', { clients });
    }

    // Handle vex disconnection
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
