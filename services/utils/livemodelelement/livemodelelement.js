// LiveModelElement: Generic web component synced live to a database model
class LiveModelElement extends HTMLElement {
  constructor () {
    super();
    this.handleUpdate = this.handleUpdate.bind(this);
    this.live = null;
    this.socket = this.constructor.socket;
  }

  connect (modelName, id) {
    console.log('attempting to connect', modelName, id);
    if (!modelName || !id) {
      console.error('LiveModelElement: connect() requires modelName and id');
      return;
    }
    this.disconnect();
    console.log('LiveModelElement: connect', modelName, id);
    this.modelName = modelName;
    this.id = id;
    if (!this.socket) {
      console.error('LiveModelElement: No socket instance set on the class. Set LiveModelElement.socket (on the class itself, not the object) before using.');
      return;
    }
    if (!this.modelName || !this.id) {
      return;
    }
    this.socket.on('disconnect', () => {});
    this.socket.emit('live-model-element-subscribe', { modelName: this.modelName, id: this.id });
    this.socket.on('live-model-element-update', this.handleUpdate);
    this.socket.emit('live-model-element-get', { modelName: this.modelName, id: this.id }, doc => {
      if (doc) {
        this.live = this.createLiveState(doc);
        if (typeof this.render === 'function') {
          this.render();
        }
      }
    });
  }

  disconnect () {
    if (this.socket && this.modelName && this.id) {
      this.socket.emit('live-model-element-unsubscribe', { modelName: this.modelName, id: this.id });
      this.socket.off('live-model-element-update', this.handleUpdate);
    }
  }

  handleUpdate (doc) {
    if (doc && doc._id === this.id) {
      this.live = this.createLiveState(doc);
      if (typeof this.render === 'function') {
        this.render();
      }
    }
  }

  createLiveState (doc) {
    return new Proxy(doc, {
      set: (target, key, value) => {
        target[key] = value;
        if (key !== '_id') {
          const liveObject = JSON.parse(JSON.stringify(target));
          this.socket.emit('live-model-element-patch', { modelName: this.modelName, _id: this.id, liveObject });
        }
        if (typeof this.render === 'function') {
          this.render();
        }
        return true;
      }
    });
  }

  disconnectedCallback () {
    this.disconnect();
  }
}

// Static property for socket instance
LiveModelElement.socket = false;

