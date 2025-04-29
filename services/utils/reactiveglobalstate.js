/*
reactive store usage:

state.somevariable = 123; // Sets value and triggers subscribers
state.somevariable; // Gets value: 123
const handler = (value) => console.log('Changed:', value);
state.on('somevariable', handler); // Subscribe to changes
state.off('somevariable', handler); // Unsubscribe from changes
*/

// Create a reactive store with optional initial state
const state = new Proxy({
  _subscribers: {}
}, {
  // when setting a value...
  set (target, key, value) {
    // don't allow object assignment
    if (typeof value === 'object') {
      throw new Error('Only primitive values are allowed in global reactive state');
    }
    // make sure it's not trying to modify an internal property
    if (key === '_subscribers') {
      throw new Error('Cannot modify internal property');
    }
    // ...set the value...
    target[key] = value;
    // ...and notify all subscribers
    (target._subscribers[key] || []).forEach(fn => fn(value));
    return true;
  },
  // when getting a value...
  get (target, key) {
    // make state.on('key', f) add a subscriber to the key
    if (key === 'on') {
      return (k, fn) => {
        (target._subscribers[k] ||= []).push(fn);
        fn(target[k]);
      };
    }
    // make state.off('key', f) remove a subscriber from the key
    if (key === 'off') {
      return (k, fn) => {
        target._subscribers[k] = (target._subscribers[k] || []).filter(f => f !== fn);
      };
    }

    // return self
    if (key === '_state') {
      return target;
    }
    return target[key];
  }
});

