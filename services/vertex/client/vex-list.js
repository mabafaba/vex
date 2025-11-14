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
    this._loading = false;

    this.handleNewChild = async (data) => {
      if (data.parentId === this._parentVex) {
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
    };
  }

  static get observedAttributes () {
    return ['parent-vex', 'view-mode'];
  }

  attributeChangedCallback (name, oldValue, newValue) {
    if (name === 'parent-vex' && oldValue !== newValue) {
      this.parentVex = newValue;
    }
    if (name === 'view-mode' && oldValue !== newValue) {
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
    if (this._parentVex === val) {
      return;
    }

    if (!this._socket) {
      this.setupSocket();
    }
    if (this._parentVex) {
      this.leaveRoom(this._parentVex);
    }
    if (val) {
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
    this._loading = true;
    this.render();
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
      this._loading = false;
      this.render();
    } catch (e) {
      this._vexes = [];
      this._loading = false;
      this.render();
    }
  }

  setupSocket () {
    if (!this._socket) {
      if (!this.constructor.socket) {
        console.error('VexList Element: No socket instance set on the class. Set VexList.socket (on the class itself, not the object) before using.');
        return;
      } else {
        this._socket = this.constructor.socket;
      }
    }

    // Get JWT token from cookie
    const getCookie = (name) => {
      const value = `; ${document.cookie}`;
      const parts = value.split( ';' + name + '=' );
      if (parts.length === 2) {
        return parts.pop().split(';').shift();
      }
    };

    // Listen for new child events
    this._socket.on('newChild', this.handleNewChild);

    // Listen for reactionChange events
    this._socket.on('reactionChange', (data) => {
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
          if (!vex.userReactions[type].includes(window.state?.userid)) {
            vex.userReactions[type].push(window.state?.userid);
          }
        } else {
          // Remove userId if present
          vex.userReactions[type] = vex.userReactions[type].filter(id => id !== window.state?.userid);
        }
        // Update the vex-reactions component for this vex
        const vexDisplay = this.shadowRoot.querySelector(`vex-display[vex-id='${vertexId}']`);

        if (vexDisplay) {
          const vexReactions = vexDisplay.shadowRoot && vexDisplay.shadowRoot.querySelector('vex-reactions');

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
    console.log('joining room for vex', vexId);
    // which location is the user regsitered in?

    this._socket.emit('joinVexRoom', vexId);
  }

  leaveRoom (vexId) {
    console.log('leaving room', vexId);
    this._socket.emit('leaveVexRoom', vexId);
  }

  disconnectedCallback () {
    if (this._socket && this._parentVex) {
      this.leaveRoom(this._parentVex);
      this._socket.off('newChild', this.handleNewChild);
    }
  }

  render () {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          height: 100%;
        }
        .vex-list {
          flex-direction: column;
          gap: 8px;
          overflow-y: auto;
          height: 100%;
          scrollbar-width: none;
          -ms-overflow-style: none;
          padding-top: 12px;
          box-sizing: border-box;
        }
        .vex-list::-webkit-scrollbar {
          display: none;
        }
        .loading-spinner {
          width: 100%;
          text-align: center;
          color: #7d0585;
          font-size: 1.2em;
          margin: 1.5em 0;
          letter-spacing: 2px;
          min-height: 1.5em;
        }

        vex-display {
          display: block;
        }

      </style>
      <div class="vex-list">
        <div class="loading-spinner" style="display:${this._loading ? 'block' : 'none'}"><span id="dots">.</span></div>
      </div>
    `;

    if (this._loading) {
      // Animate the dots
      const dots = this.shadowRoot.getElementById('dots');
      let count = 1;
      if (this._dotsInterval) {
        clearInterval(this._dotsInterval);
      }
      this._dotsInterval = setInterval(() => {
        count = (count % 3) + 1;
        dots.textContent = '.'.repeat(count);
      }, 250);
      return;
    } else {
      if (this._dotsInterval) {
        clearInterval(this._dotsInterval);
        this._dotsInterval = null;
      }
    }
    const listDiv = this.shadowRoot.querySelector('.vex-list');
    this._vexes.forEach((vex) => {
      const vexDisplay = document.createElement('vex-display');
      vexDisplay.vex = vex;
      vexDisplay.setAttribute('view-mode', this._viewMode);
      vexDisplay.setAttribute('vex-id', vex._id);
      vexDisplay.addEventListener('vex-main-click', this._onClick.bind(this));
      listDiv.appendChild(vexDisplay);
    });
  }

  connectedCallback () {
    if (this.hasAttribute('parent-vex')) {
      this.parentVex = this.getAttribute('parent-vex');
    }
    if (this.hasAttribute('view-mode')) {
      this.viewMode = this.getAttribute('view-mode');
    }
    this.fetchVexes();
    this.render();
    this.setupSocket();
  }

  // Add a sortBy method for external sort controls
  sortBy (sort) {
    if (this._currentSort === sort) {
      return;
    }
    this._currentSort = sort;
    this.fetchVexes(sort);
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
    listDiv.appendChild(vexDisplay);
    // scroll to the bottom of the list
    // scroll to the bottom of the list after next tick
    setTimeout(() => {
      listDiv.scrollTop = listDiv.scrollHeight;
    });
  }

  // Method to re-setup socket when it becomes available after login
  reconnectSocket () {
    console.log('VexList: Reconnecting socket');
    this._socket = null; // Reset socket reference
    this.setupSocket(); // Re-setup with new socket

    // Re-join room if we have a parent vex
    if (this._parentVex) {
      this.joinRoom(this._parentVex);
    }
  }
}

customElements.define('vex-list', VexList);
