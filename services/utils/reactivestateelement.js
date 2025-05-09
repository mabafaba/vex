class ReactiveStateElement extends HTMLElement {
  constructor () {
    super();

    this.__renderScheduled = false;
    const scheduleRender = () => {
      if (this.__renderScheduled) {
        return;
      }
      this.__renderScheduled = true;
      requestAnimationFrame(() => {
        this.__renderScheduled = false;
        this.render();
      });
    };

    // Use shared reactive state
    const state = reactive();
    state.on('__change__', scheduleRender);
    Object.defineProperty(this, 'state', {
      value: state,
      writable: false,
      enumerable: true,
      configurable: false
    });
  }

  render () {
    console.error('implement render method for', this.tagName);
  }
}
