const reactive = () => {
  target = {};
  Object.defineProperty(target, '_subscribers', { value: {}, enumerable: false, writable: false });
  return new Proxy(target, {
    set(target, key, value) {
      if (['_subscribers', 'on', 'off', '_state', '__change__'].includes(key)) throw new Error("on, off,  _subscribers _state reservered for internal use");
      if (typeof value === 'object' && value !== null) throw new TypeError("Reactive state properties can only hold primitive values.");
      
      const oldValue = target[key];
      if (value === oldValue) return true; // Don't trigger if value hasn't changed
      
      target[key] = value;
      // Trigger specific subscribers
      (target._subscribers[key] || []).forEach(callback => callback(value));
      // Trigger general change subscribers
      (target._subscribers['__change__'] || []).forEach(callback => callback({ key, value, oldValue }));
      return true;
    },
    get(target, key) {
      if (key === 'on') { return (eventKey, callback) => (target._subscribers[eventKey] ||= []).push(callback);}
      if (key === 'off') { return (eventKey, callback) => { target._subscribers[eventKey] = (target._subscribers[eventKey] || []).filter(fn => fn !== callback);};}
      if(key==="_state") return target;
      return target[key];
    }
  });
};

class ReactiveElement extends HTMLElement {
  constructor() {
    super();
    Object.defineProperty(this, 'state', {
      value: reactive(),
      writable: false,    
      enumerable: true,   
      configurable: false 
    });
    this.state.on('__change__', this.render.bind(this));
  }
  render() {
    console.error('implement render method or use non reactive web component for ', this.tagName);
  }
}

const state = reactive();