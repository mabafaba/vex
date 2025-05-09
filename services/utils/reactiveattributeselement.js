class ReactiveAttributesElement extends HTMLElement {
  constructor () {
    super();
    this.__renderScheduled = false;
  }

  connectedCallback () {
    // render if any attribute changes
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
  // render at most once per animation frame
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
    // To be implemented by subclasses
    console.error('implement render method for', this.tagName);
  }
}

