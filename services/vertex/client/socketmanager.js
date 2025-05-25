  constructor () {
    this.socket = null;
    this.connectionAttempts   constructor () {
    this.socket = null;
    this.connectionAttempts = 0;
    this.maxAttempts = 3;
    this.connectionListeners = new Set();
  }

  // Get or create socket connection
  getSocket () {
    if (!this.socket) {
      this.connect();
    }
    return this.socket;
  }

  // Connect to socket server with authentication
  connect () {
    if (this.socket) {
      return;
    }

    // Get JWT token from cookie
    const getCookie = (name) => {
      const value = `; ${document.cookie}`;
      const parts = value.split(`; ${name}=`);
      if (parts.length === 2) {
        return parts.pop().split(';').shift();
      }
    };

    const token = getCookie('jwt');

    if (!token) {
      console.warn(
        'No JWT token found. Socket connection will fail authentication.'
      );
    }

    // Connect to socket server
    this.socket = io(window.location.hostname + ':3005', {
      transports: ['websocket', 'polling'],
      auth: {
        token: token
      },
      withCredentials: true
    });

    // Handle connection events
    this.socket.on('connect', () => {
      this.connectionAttempts = 0;
      this.notifyConnectionListeners('connected');
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      this.notifyConnectionListeners('error', error);

      // Handle authentication errors
      if (error.message.includes('Authentication error')) {
        console.warn('Authentication failed. Please log in again.');
        this.notifyConnectionListeners('auth-error', error);
      }
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
      this.notifyConnectionListeners('disconnected', reason);

      // Attempt to reconnect if not explicitly disconnected
      if (reason !== 'io client disconnect') {
        this.reconnect();
      }
    });

    this.socket.on('error', (error) => {
      console.error('Socket error:', error);
      this.notifyConnectionListeners('error', error);
    });
  }

  // Reconnect with exponential backoff
  reconnect () {
    if (this.connectionAttempts >= this.maxAttempts) {
      console.error('Max reconnection attempts reached');
      return;
    }

    const delay = Math.min(1000 * Math.pow(2, this.connectionAttempts), 30000);
    this.connectionAttempts++;

    setTimeout(() => {
      console.log(
        `Attempting to reconnect (attempt ${this.connectionAttempts})`
      );
      this.socket.connect();
    }, delay);
  }

  // Add connection state listener
  addConnectionListener (callback) {
    this.connectionListeners.add(callback);
  }

  // Remove connection state listener
  removeConnectionListener (callback) {
    this.connectionListeners.delete(callback);
  }

  // Notify all connection listeners
  notifyConnectionListeners (event, data) {
    this.connectionListeners.forEach((listener) => listener(event, data));
  }

  // Disconnect socket
  disconnect () {
t = null;
    }
  }
}

// Export singleton instance
const socketManager = new SocketManager();
window.socketManager = socketManager; // Expose to window for global access
export default socketManager;
