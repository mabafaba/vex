// libraries
const express = require('express');
const cookieParser = require('cookie-parser');
const userService = require("./services/users");
const socketIo = require('socket.io');

// services
const vertexService = require("./services/vertex");
const connectDB = require("./services/database");

connectDB("vex")
    .then(() => {console.log("Connected to MongoDB");})
    .catch((err) => {console.error("Error connecting to MongoDB", err)});


const port = 3005;
const app = express();
const server = require('http').createServer(app);

// Initialize socket.io with more permissive CORS to fix connection issues
const io = socketIo(server, {
    cors: {
        origin: "*", // Allow all origins
        methods: ["GET", "POST"],
        credentials: true,
        allowedHeaders: ["Content-Type", "Authorization"]
    },
    path: '/socket.io', // Make sure path matches client expectations
    transports: ['websocket', 'polling'] // Support multiple transport methods
});

app.use(cookieParser());
app.use(express.json());

app.use('/vex/user', userService.app);

app.use('/vex/vertex', vertexService.router);


// app.use('/vex/vertex', userService.authorizeBasic, sendUnauthorizedStatus, vertexService.router);

// Socket.io connection handling
io.on('connection', (socket) => {
    console.log('New client connected', socket.id);
    
    // Join a room for a specific vex thread
    socket.on('joinVexRoom', (vexId) => {
        socket.join(`vex-${vexId}`);
        console.log(`Client ${socket.id} joined room: vex-${vexId}`);
    });
    
    // Leave a room when no longer viewing the thread
    socket.on('leaveVexRoom', (vexId) => {
        socket.leave(`vex-${vexId}`);
        console.log(`Client ${socket.id} left room: vex-${vexId}`);
    });
    
    socket.on('disconnect', () => {
        console.log('Client disconnected', socket.id);
    });
});

// Make io accessible to other modules
app.set('io', io);

server.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
    console.log(`Socket.io server listening on port ${port}`);
});