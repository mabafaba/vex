// LiveModelElement: Generic web component synced live to a backend resource via HTTP and socket updates
class LiveModelElement extends HTMLElement {
  constructor () {
    super();
    this.endpoint = null;
    this.socket = this.constructor.socket;
    this.live = null;
    this._updateHandler = this._updateHandler.bind(this);
  }

  connect (endpoint) {
    this.disconnect();
    this.endpoint = endpoint;
    if (!this.endpoint) {
      return;
    }
    // Fetch initial data
    fetch(this.endpoint)
      .then(res => res.json())
      .then(doc => {
        this.live = doc;
        if (typeof this.render === 'function') {
          this.render();
        }
      });
    // Subscribe to socket updates for this endpoint
    if (this.socket) {
      this.socket.emit('live-model-element-subscribe', { endpoint: this.endpoint });
      this.socket.on(`live-model-element-update:${this.endpoint}`, this._updateHandler);
    }
  }

  disconnect () {
    if (this.socket && this.endpoint) {
      this.socket.emit('live-model-element-unsubscribe', { endpoint: this.endpoint });
      this.socket.off(`live-model-element-update:${this.endpoint}`, this._updateHandler);
    }
  }

  _updateHandler () {
    // On update, re-fetch the data
    if (this.endpoint) {
      fetch(this.endpoint)
        .then(res => res.json())
        .then(doc => {
          this.live = doc;
          if (typeof this.render === 'function') {
            this.render();
          }
        });
    }
  }

  disconnectedCallback () {
    this.disconnect();
  }
}

// Static property for socket instance
LiveModelElement.socket = false;

