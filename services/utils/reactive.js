const reactive = () => {
  const target = {};
  Object.defineProperty(target, '_subscribers', { value: {}, enumerable: false, writable: false });
  return new Proxy(target, {
    set (target, key, value) {
      if (['_subscribers', 'on', 'off', '_state', '__change__'].includes(key)) {
        throw new Error('on, off,  _subscribers _state reservered for internal use');
      }
      if (typeof value === 'object' && value !== null) {
        throw new TypeError('Reactive state properties can only hold primitive values.');
      }

      const oldValue = target[key];
      if (value === oldValue) {
        return true;
      } // Don't trigger if value hasn't changed

      target[key] = value;
      // Trigger specific subscribers
      (target._subscribers[key] || []).forEach(callback => callback(value));
      // Trigger general change subscribers
      (target._subscribers['__change__'] || []).forEach(callback => callback({ key, value, oldValue }));
      return true;
    },
    get (target, key) {
      if (key === 'on') {
        return (eventKey, callback) => (target._subscribers[eventKey] ||= []).push(callback);
      }
      if (key === 'off') {
        return (eventKey, callback) => {
          target._subscribers[eventKey] = (target._subscribers[eventKey] || []).filter(fn => fn !== callback);
        };
      }
      if (key === '_state') {
        return target;
      }
      return target[key];
    }
  });
};

class ReactiveHTMLElement extends HTMLElement {
  constructor () {
    super();
    this.__renderScheduled = false;

    // Setup reactive state
    const state = reactive();
    state.on('__change__', () => this.scheduleRender());
    Object.defineProperty(this, 'state', {
      value: state,
      writable: false,
      enumerable: true,
      configurable: false
    });
  }

  connectedCallback () {
    // Observe attribute changes
    if (!this._mo) {
      this._mo = new MutationObserver(mutations => {
        for (const m of mutations) {
          if (m.type === 'attributes') {
            this.scheduleRender();
            break;
          }
        }
      });
      this._mo.observe(this, { attributes: true });
    }
    this.scheduleRender();
  }

  disconnectedCallback () {
    if (this._mo) {
      this._mo.disconnect();
    }
  }

  scheduleRender () {
    if (this.__renderScheduled) {
      return;
    }
    this.__renderScheduled = true;
    requestAnimationFrame(() => {
      this.__renderScheduled = false;
      this.render();
    });
  }

  render () {
    console.error('implement render method for', this.tagName);
  }
}
