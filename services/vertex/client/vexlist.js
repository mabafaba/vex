// Generic <vex-list> web component for rendering a list of vex objects

class VexList extends HTMLElement {
  constructor () {
    super();
    this.attachShadow({ mode: 'open' });
    this._vexes = [];
    this._viewMode = 'normal';
    this._parentVex = null;
    this._socket = null;
    this._onClick = () => {};
    this._connectionListener = null;
    this._currentSort = 'date';
  }

  static get observedAttributes () {
    return ['parent-vex', 'view-mode'];
  }

  attributeChangedCallback (name, oldValue, newValue) {
    if (name === 'parent-vex' && oldValue !== newValue) {
      console.log('Parent vex changed:', newValue);
      this.parentVex = newValue;
    }
    if (name === 'view-mode' && oldValue !== newValue) {
      console.log('change list view mode to', newValue);
      this.viewMode = newValue;
    }
  }

  set onClick (callback) {
    this._onClick = callback;
    // remove old event listener
    const vexDisplays = this.shadowRoot.querySelectorAll('vex-display');
    vexDisplays.forEach((vexDisplay) => {
      vexDisplay.removeEventListener('vex-main-click', this._onClick);
    });
    // add new event listener
    vexDisplays.forEach((vexDisplay) => {
      vexDisplay.addEventListener('vex-main-click', this._onClick);
    });
  }

  set parentVex (val) {
    console.log('Setting parent vex:', val);
    console.log('Current parent vex:', this._parentVex);
    if (this._parentVex === val) {
      return;
    }

    if (!this._socket) {
      this.setupSocket();
    }
    if (this._parentVex) {
      console.log('Leaving vex room:', this._parentVex);
      this.leaveRoom(this._parentVex);
    }
    if (val) {
      console.log('joinRoom Joining vex room:', val);
      this.joinRoom(val);
    }
    this._parentVex = val;
    this.fetchVexes();
  }

  get parentVex () {
    return this._parentVex;
  }

  set vexes (list) {
    this._vexes = Array.isArray(list) ? list : [];
    this.render();
  }

  get vexes () {
    return this._vexes;
  }

  set viewMode (mode) {
    console.log('change list view mode to', mode);
    this._viewMode = mode;
    this.render();
  }

  get viewMode () {
    return this._viewMode;
  }

  async fetchVexes (sortBy = 'date') {
    if (!this._parentVex) {
      return;
    }
    try {
      const response = await fetch(`/vex/vertex/${this._parentVex}/children/${sortBy}`);
      if (!response.ok) {
        if (response.status === 401) {
          this.dispatchEvent(new CustomEvent('vex-list-unauthorized'));
        }
        throw new Error('Failed to fetch children');
      }
      const children = await response.json();
      this._vexes = children;
      this.render();
    } catch (e) {
      this._vexes = [];
      this.render();
    }
  }

  setupSocket () {
    if (!window.io) {
      console.error('Socket.io not available');
      return;
    }

    // Get JWT token from cookie
    const getCookie = (name) => {
      const value = `; ${document.cookie}`;
      const parts = value.split( ';' + name + '=' );
      if (parts.length === 2) {
        return parts.pop().split(';').shift();
      }
    };

    const token = getCookie('jwt');

    // Connect to socket server with authentication
    this._socket = io(window.location.hostname + ':3005', {
      transports: ['websocket', 'polling'],
      auth: {
        token: token
      },
      withCredentials: true
    });

    // Handle connection errors
    this._socket.on('connect_error', (error) => {
      if (error.message.includes('Authentication error')) {
        console.warn('Authentication failed. Please log in again.');
      }
    });

    // Listen for new child events
    this._socket.on('newChild', async (data) => {
      console.log('New child vex event received:', data);
      if (data.parentId === this._parentVex) {
        console.log('New child vex received:', data);
        // Fetch the new vex data
        try {
          const response = await fetch(`/vex/vertex/${data.childId}`);
          if (!response.ok) {
            throw new Error('Failed to fetch new vex');
          }
          const newVex = await response.json();
          this.addVex(newVex);
        } catch (error) {
          console.error('Error fetching new vex:', error);
        }
      }
    });

    // Listen for reactionChange events
    this._socket.on('reactionChange', (data) => {
      console.log('Reaction change event received:', data);
      // data: { vertexId, type, on }
      const { vertexId, type, on } = data;
      // Find the vex in the local array
      const vex = this._vexes.find(v => v._id === vertexId);
      if (vex) {
        if (!vex.userReactions) {
          vex.userReactions = {};
        }
        if (!vex.userReactions[type]) {
          vex.userReactions[type] = [];
        }
        if (on) {
          // Add userId if not present
          if (!vex.userReactions[type].includes(state.userid)) {
            vex.userReactions[type].push(state.userid);
          }
        } else {
          // Remove userId if present
          vex.userReactions[type] = vex.userReactions[type].filter(id => id !== state.userid);
        }
        // Update the vex-reactions component for this vex
        const vexDisplay = this.shadowRoot.querySelector(`vex-display[vex-id='${vertexId}']`);
        console.log('vexDisplay', vexDisplay);
        if (vexDisplay) {
          const vexReactions = vexDisplay.shadowRoot && vexDisplay.shadowRoot.querySelector('vex-reactions');
          console.log('vexReactions', vexReactions);
          if (vexReactions) {
            // Update the attribute to trigger re-render
            vexReactions.setAttribute('vex-reactions', JSON.stringify(vex.userReactions));
            vexReactions.connectedCallback();
          }
        }
      }
    });
  }

  joinRoom (vexId) {
    console.log('joining vex room:', vexId);
    this._socket.emit('joinVexRoom', vexId);
  }

  leaveRoom (vexId) {
    console.log('leaving vex room:', vexId);
    this._socket.emit('leaveVexRoom', vexId);
  }

  disconnectedCallback () {
    if (this._socket && this._parentVex) {
      this.leaveRoom(this._parentVex);
      this._socket.off('newChild');
    }
  }

  render () {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
        }
        .vex-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
      </style>
      <div class="vex-list"></div>
      <vex-sort-controls current-sort="${this._currentSort}"></vex-sort-controls>
    `;

    const listDiv = this.shadowRoot.querySelector('.vex-list');
    this._vexes.forEach((vex) => {
      const vexDisplay = document.createElement('vex-display');
      vexDisplay.vex = vex;
      vexDisplay.setAttribute('view-mode', this._viewMode);
      vexDisplay.setAttribute('vex-id', vex._id);
      vexDisplay.addEventListener('vex-main-click', this._onClick.bind(this));
      listDiv.appendChild(vexDisplay);
    });

    // Listen for sort changes
    const sortControls = this.shadowRoot.querySelector('vex-sort-controls');
    sortControls.addEventListener('sort-changed', (e) => {
      this._currentSort = e.detail.sort;
      this.fetchVexes(this._currentSort);
    });
  }

  connectedCallback () {
    console.log('VexList connected');
    if (this.hasAttribute('parent-vex')) {
      console.log(
        'found Parent vex attribute:',
        this.getAttribute('parent-vex')
      );
      this.parentVex = this.getAttribute('parent-vex');
    }
    if (this.hasAttribute('view-mode')) {
      this.viewMode = this.getAttribute('view-mode');
    }
    this.fetchVexes();
    this.setupSocket();
    this.render();
  }

  addVex (vex) {
    if (!vex || typeof vex !== 'object') {
      return;
    }
    this._vexes.push(vex);
    const listDiv = this.shadowRoot.querySelector('.vex-list');
    const vexDisplay = document.createElement('vex-display');
    vexDisplay.vex = vex; // Pass data via property only
    vexDisplay.setAttribute('view-mode', this._viewMode);
    vexDisplay.setAttribute('vex-id', vex._id);
    // Attach event listener directly to vex-display
    vexDisplay.addEventListener('vex-main-click', this._onClick.bind(this));
    listDiv.prepend(vexDisplay);
  }
}

customElements.define('vex-list', VexList);
