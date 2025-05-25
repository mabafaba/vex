// LiveModelElement: Generic web component synced live to a backend resource via HTTP and socket updates
class LiveModelElement extends HTMLElement {
  constructor () {
    super();
    this.endpoint = null;
    this.id = null;
    this.url = null;
    this.socket = this.constructor.socket;
    this.live = null;
    this._updateHandler = this._updateHandler.bind(this);
  }

  connect (url, id) {
    this.disconnect();
    this.url = url;
    this.id = id;
    if (!this.url || !this.id) {
      throw new Error('LiveModelElement: connect() requires url and id');
    }

    this.endpoint = `${this.url}/${this.id}`;

    // Fetch initial data
    // show seconds and milliseconds
    const fetchStart = new Date().getSeconds() + ' ' + new Date().getMilliseconds();

    fetch(this.endpoint)
      .then(res => res.json())
      .then(doc => {
        this.live = doc;
        if (typeof this.render === 'function') {
          console.log('fetched at: ', fetchStart, 'rendered at:', new Date().getSeconds() + ' ' + new Date().getMilliseconds());
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
      console.log('fetching live model data at ms', new Date().getMilliseconds());
      fetch(this.endpoint)
        .then(res => res.json())
        .then(doc => {
          this.live = doc;
          if (typeof this.render === 'function') {
            console.log('rendering live model data at ms', new Date().getMilliseconds());
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

