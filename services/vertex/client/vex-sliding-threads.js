class VexSlidingThreads extends HTMLElement {
  constructor () {
    super();
    this.attachShadow({ mode: 'open' });
    this._slider = null;
    this.activeThread = null;
  }

  connectedCallback () {
    this.init();
  }

  init () {
    this.vexId = this.getAttribute('vex-id');
    if (!this.vexId) {
      console.warn('No vex-id attribute found.');
      return;
    }
    this.render();
    this.initFirstThread();
    this.listenForClickEvents();
  }

  render () {
    this.shadowRoot.innerHTML = `
      <style>
        :host { display: block; width: 100%; height: 100%; }
        page-slider { width: 100%; height: 100%; display: block; }
        /* scroll y on sliding pages */
        
        slider-page > vex-thread {
          overflow-y: scroll;
          width: 100%;
          height: 100%;
        }
      </style>
      <page-slider id="slider">
        <!-- Pages will be added here -->
      </page-slider>
    `;
    this._slider = this.shadowRoot.getElementById('slider');
  }

  /**
   * Initialize the first thread page from attribute or default
   */
  initFirstThread () {
    const vexId = this.getAttribute('vex-id');

    if (!vexId) {
      // fallback default
      console.warn('No vex-id attribute found.');
      return;
    }

    this.addThreadPage(vexId);
  }

  /**
   * Add a new thread page and slide to it
   */
  addThreadPage (vexId) {
    this.activeThread = vexId;
    const sliderPage = document.createElement('slider-page');
    const thread = document.createElement('vex-thread');
    thread.setAttribute('vex-id', vexId);
    sliderPage.appendChild(thread);
    this._slider.appendChild(sliderPage);
    this._slider.updatePages();
    // Use the public API to get the pages array after updatePages
    let pages = this._slider._pages;
    if (!pages) {
      pages = Array.from(this._slider.children)
        .filter(child => child.tagName && child.tagName.toLowerCase() === 'slider-page');
    }
    this._slider.slideTo(pages.length - 1);
  }

  listenForClickEvents () {
    this.addEventListener('vex-main-click', (event) => {
      const vexId = event.detail.vexId;
      if (vexId && vexId == this.activeThread) {
        return;
      }
      if (vexId) {
        this.addThreadPage(vexId);
      }
    });

    this.addEventListener('breadcrumb-click', (event) => {
      console.log('Breadcrumb clicked:', event.detail);

      // check which page has same vexId as the breadcrumb
      const clickedVexId = event.detail.vexId;
      const pages = Array.from(this._slider.children)
        .filter(child => child.tagName && child.tagName.toLowerCase() === 'slider-page');
      for (let i = 0; i < pages.length; i++) {
        const page = pages[i];
        const thread = page.querySelector('vex-thread');
        if (thread && thread.getAttribute('vex-id') === clickedVexId) {
          this._slider.slideTo(i);
          break;
        }
      }
    }
    );
  }
}

customElements.define('vex-sliding-threads', VexSlidingThreads);
