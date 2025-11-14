// vex-app.js - Main application web component
class VexApp extends HTMLElement {
  constructor () {
    super();
    this.vexId = null;
    this.user = null;
    this.socket = null;
    this.refreshTimeout = null;
  }

  async connectedCallback () {
    this.initializeSocket();
    this.addStyles();
    this.render();
    await this.checkUserLocation();
    await this.initializeThread();
    this.setupEventListeners();
  }

  addStyles () {
    // Add styles for the vex-app container
    const style = document.createElement('style');
    style.textContent = `
      .vex-app-container {
        height: 100%;
        overflow: hidden;
        display: flex;
        flex-direction: column;
      }
    `;
    document.head.appendChild(style);
  }

  disconnectedCallback () {
    // Clean up event listeners and socket
    this.removeEventListeners();
    if (this.socket) {
      this.socket.disconnect();
    }
  }

  render () {
    this.innerHTML = `
      <div class="vex-app-container">
        <div class="user-status-container">
          <user-status
            me-endpoint="/vex/user/me"
            logout-endpoint="/vex/user/logout"
            login-endpoint="/vex/user/login"
            register-endpoint="/vex/user/register"
          >
          </user-status>
        </div>

        <div class="main-container">
          <div class="thread-container">
            <vex-thread id="main-sliding-threads"></vex-thread>
          </div>
        </div>

        <div class="socket-status"></div>
      </div>
    `;
  }

  async initializeThread () {
    // Get the vex ID and set it on the sliding threads
    this.vexId = await this.getVexId();
    const slidingThreads = this.querySelector('#main-sliding-threads');
    if (slidingThreads) {
      slidingThreads.setAttribute('vex-id', this.vexId);
    }
  }

  async getVexId () {
    const urlParams = new URLSearchParams(window.location.search);
    let vexId = urlParams.get('id');
    if (!vexId) {
      console.warn('No vex id provided in the URL, fetching initial vertex');
      try {
        const response = await fetch('/vex/vertex/initial');
        if (response.ok) {
          const data = await response.json();
          vexId = data.id;
          console.log('Using initial vertex ID:', vexId);
        } else {
          console.error('Failed to fetch initial vertex, using fallback');
          vexId = '6898a5960723783a9ef8ca71'; // Keep fallback for safety
        }
      } catch (error) {
        console.error('Error fetching initial vertex:', error);
        vexId = '6898a5960723783a9ef8ca71'; // Keep fallback for safety
      }
    }
    return vexId;
  }

  initializeSocket () {
    this.socket = io({
      transports: ['websocket'],
      autoConnect: false,
      path: '/vex-socket-io'
    });

    console.log('VexApp socket initializing');

    // other classes that need the socket
    VexList.socket = this.socket;
    LiveModelElement.socket = this.socket;

    this.socket.connect();
    this.socket.on('connect', () => {
      console.log('Socket connected');
      this.updateSocketStatus(true);
    });

    this.socket.on('disconnect', () => {
      console.log('Socket disconnected');
      this.updateSocketStatus(false);
    });

    // Set socket on global classes
    console.log('VexApp setting socket on global classes');
    VexList.socket = this.socket;
    LiveModelElement.socket = this.socket;
  }

  updateSocketStatus (connected) {
    const statusIndicator = this.querySelector('.socket-status');
    if (statusIndicator) {
      statusIndicator.style.backgroundColor = connected ? '#00C851' : '#ff4444';
    }
  }

  setupEventListeners () {
    // Listen for user authentication events
    this.addEventListener('login-success', () => this.onUserChanged());
    this.addEventListener('registered-success', () => this.onUserChanged());
    this.addEventListener('user-logout', () => this.onUserLogout());
    this.addEventListener('location-saved', () => this.onLocationChanged());
  }

  removeEventListeners () {
    // Remove all event listeners
    this.removeEventListener('login-success', this.onUserChanged);
    this.removeEventListener('registered-success', this.onUserChanged);
    this.removeEventListener('user-logout', this.onUserLogout);
    this.removeEventListener('location-saved', this.onLocationChanged);
  }

  onUserChanged () {
    console.log('VexApp: User state changed');
    this.debouncedRefresh();
    this.handleUserLocation();
    this.reconnectSocketWithAuth();
  }

  onUserLogout () {
    console.log('VexApp: User logged out');
    this.debouncedRefresh();
    this.disconnectSocket();
  }

  onLocationChanged () {
    console.log('VexApp: Location changed');
    this.debouncedRefresh();
  }

  debouncedRefresh () {
    if (this.refreshTimeout) {
      clearTimeout(this.refreshTimeout);
    }
    this.refreshTimeout = setTimeout(() => {
      this.refreshMainThread();
    }, 100); // 100ms debounce
  }

  refreshMainThread () {
    console.log('VexApp: Refreshing main thread');
    const slidingThreads = this.querySelector('#main-sliding-threads');
    if (slidingThreads && typeof slidingThreads.refresh === 'function') {
      slidingThreads.refresh();
    }
  }

  async handleUserLocation () {
    try {
      const response = await fetch('/vex/user/me', {
        credentials: 'include'
      });
      const userData = await response.json();

      // Create location picker if it doesn't exist
      if (!this.querySelector('location-picker-dialog')) {
        const dialog = document.createElement('location-picker-dialog');
        this.querySelector('.user-status-container').appendChild(dialog);
        console.log('VexApp: Location picker dialog created');

        // Add event listener for location-saved event
        dialog.addEventListener('location-saved', () => {
          console.log('VexApp: Location saved event');
          this.onLocationChanged();
        });
      } else {
        console.log('VexApp: Location picker dialog already exists');
        const dialog = this.querySelector('location-picker-dialog');
        if (dialog && typeof dialog.loadCurrentLocation === 'function') {
          dialog.loadCurrentLocation();
        }
      }
    } catch (error) {
      console.error('VexApp: Error checking user location data:', error);
    }
  }

  async checkUserLocation () {
    try {
      const response = await fetch('/vex/user/me', {
        credentials: 'include'
      });
      if (response.ok) {
        console.log('VexApp: User logged in');
        const userData = await response.json();
        this.user = userData;

        // Create location picker if it doesn't exist
        if (!this.querySelector('location-picker-dialog')) {
          const dialog = document.createElement('location-picker-dialog');
          this.querySelector('.user-status-container').appendChild(dialog);
          console.log('VexApp: Location picker dialog created');

          // Add event listener for location-saved event
          dialog.addEventListener('location-saved', () => {
            console.log('VexApp: Location saved event');
            this.onLocationChanged();
          });
        }
      } else {
        console.log('VexApp: User not logged in');
      }
    } catch (error) {
      console.error('VexApp: Error checking user location data:', error);
    }
  }

  reconnectSocketWithAuth () {
    console.log('VexApp: Reconnecting socket with authentication');

    // Disconnect existing socket if it exists
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
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
      console.warn('VexApp: No JWT token found for socket reconnection');
      return;
    }

    // Create new socket connection with authentication
    this.socket = io({
      transports: ['websocket'],
      autoConnect: true,
      path: '/vex-socket-io',
      auth: {
        token: token
      },
      withCredentials: true
    });

    // Set socket on global classes
    VexList.socket = this.socket;
    LiveModelElement.socket = this.socket;

    // Handle connection events
    this.socket.on('connect', () => {
      console.log('VexApp: Socket reconnected with authentication');
      this.updateSocketStatus(true);
      this.reconnectVexLists();
    });

    this.socket.on('connect_error', (error) => {
      console.error('VexApp: Socket reconnection error:', error);
      this.updateSocketStatus(false);
    });

    this.socket.on('disconnect', () => {
      console.log('VexApp: Socket disconnected');
      this.updateSocketStatus(false);
    });
  }

  disconnectSocket () {
    console.log('VexApp: Disconnecting socket');

    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }

    // Clear socket from global classes
    VexList.socket = null;
    LiveModelElement.socket = null;

    this.updateSocketStatus(false);
  }

  reconnectVexLists () {
    console.log('VexApp: Reconnecting all vex-list elements');
    // Find all vex-list elements and reconnect their sockets
    const vexLists = document.querySelectorAll('vex-list');
    vexLists.forEach(vexList => {
      if (typeof vexList.reconnectSocket === 'function') {
        vexList.reconnectSocket();
      }
    });
  }
}

// Register the custom element
customElements.define('vex-app', VexApp);
