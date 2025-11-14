// New web component that combines breadcrumbs, main vex, input, and child list
class VexThread extends HTMLElement {
  constructor () {
    super();
    this.attachShadow({ mode: 'open' });
    this.vexId = null;
  }

  static get observedAttributes () {
    return ['vex-id'];
  }

  attributeChangedCallback (name, oldValue, newValue) {
    if (name === 'vex-id' && newValue !== oldValue) {
      this.vexId = newValue;
      this.render();
      this.updateAll();
    }
  }

  connectedCallback () {
    if (this.hasAttribute('vex-id')) {
      this.vexId = this.getAttribute('vex-id');
    }
    this.render();
    this.updateAll();
  }

  render () {
    this.shadowRoot.innerHTML = `
      <style>
        :host { display: block; height: 100%; }
        .vex-thread-container {
          display: flex;
          flex-direction: column;
          height: 100%;
          width: 100%;
        }
        #breadcrumbs {
          flex: 0 0 auto;
          margin-bottom: 0em;
          padding: 0;
          background: rgb(99, 78, 143);
          border-top-left-radius: 11px;
          border-top-right-radius: 11px;
        }
        #main-vex {
          flex: 0 0 auto;
          margin-bottom: -15px;
          z-index: 1;
        }
        #vex-list {
          flex: 1 1 auto;
          min-height: 0;
          overflow: auto;
        }
        #vex-input {
          flex: 0 0 auto;
          margin-top: 0px;
          border-top-left-radius: 10px;
          border-top-right-radius: 10px;

          
          
        }
        .vex-container {
          background-color: #E7C9FF;
          border-top-left-radius: 15px;
          border-top-right-radius: 15px;
          margin-left: 0px;
          margin-right: 0px;
          padding: 12px;
          margin-top: -15px;
        }
      </style>
      <div class="vex-thread-container">
        <div id="main-vex-display">
        <vex-breadcrumbs id="breadcrumbs"></vex-breadcrumbs>
        <vex-display id="main-vex" view-mode="thread" style="width:100%"></vex-display>
        </div>
        <vex-list id="vex-list"></vex-list>
        <vex-input id="vex-input"></vex-input>
      </div>
    `;

    this.setupEventListeners();
  }

  setupEventListeners () {
    // Listen for breadcrumb navigation

    // Listen for vex-main-click events (bubbled up from child components)
    this.addEventListener('vex-main-click', (event) => {
      // do nothing if the vex is already open
      if (this.getAttribute('vex-id') === event.detail.vexId) {
        return;
      }

      // Set the vex-id on this thread
      this.setAttribute('vex-id', event.detail.vexId);

      // set vex id as ?id= in the url
      // console.log('setting vex id in url', vexId);
      const urlParams = new URLSearchParams(window.location.search);
      urlParams.set('id', event.detail.vexId);
      window.history.pushState({}, '', `?${urlParams.toString()}`);

      // Get main container for slide animation
      const mainContainer = document.querySelector('.main-container');
      if (mainContainer && typeof window.slideNext === 'function') {
        window.slideNext(mainContainer, 300, () => {
        // Animation callback
        });
      }
    });

    // Listen for breadcrumb-click events (bubbled up from child components)
    this.addEventListener('breadcrumb-click', (event) => {
      // console.log('Breadcrumb clicked:', vexId);

      // Get main container for slide animation
      const mainContainer = document.querySelector('.main-container');
      if (mainContainer && typeof window.slidePrev === 'function') {
        window.slidePrev(this, 400, () => {
          this.setAttribute('vex-id', event.detail.vexId);
        });
      } else {
      // Fallback if slide functions aren't available
        this.setAttribute('vex-id', event.detail.vexId);
        // Update URL
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.set('id', event.detail.vexId);
        window.history.pushState({}, '', newUrl);
      }
    });

    // add event listener for vex-list-unauthorized
    const vexList = this.shadowRoot.getElementById('vex-list');
    vexList.addEventListener('vex-list-unauthorized', () => {
      this.shadowRoot.innerHTML = '';
    });
  }

  /**
   * Refresh method to reload the thread (replaces reloadMainThread functionality)
   */
  refresh () {
    // console.log('vex-thread refresh');

    // Update location picker dialog if it exists
    const locationPickerDialog = document.querySelector('location-picker-dialog');
    if (locationPickerDialog && typeof locationPickerDialog.loadCurrentLocation === 'function') {
      locationPickerDialog.loadCurrentLocation();
    }

    // Refresh the current thread by re-setting the vex-id
    const currentVexId = this.getAttribute('vex-id');
    if (currentVexId) {
      // Clear the vex-id to force a refresh
      this.setAttribute('vex-id', '');
      setTimeout(() => {
        this.setAttribute('vex-id', currentVexId);
      }, 0);
    }
  }

  async updateAll () {
    if (!this.vexId) {
      return;
    }
    // Update breadcrumbs
    const breadcrumbs = this.shadowRoot.getElementById('breadcrumbs');
    breadcrumbs.setAttribute('vex-id', this.vexId);
    // Update main vex
    try {
      const response = await fetch(`/vex/vertex/${this.vexId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch vex');
      }
      const vex = await response.json();
      this.shadowRoot.getElementById('main-vex').vex = vex;
    } catch (e) {
      // Optionally show error
    }
    // Update input
    this.shadowRoot
      .getElementById('vex-input')
      .setAttribute('parent-vex', this.vexId);
    // Update list
    this.shadowRoot
      .getElementById('vex-list')
      .setAttribute('parent-vex', this.vexId);
  }
}

customElements.define('vex-thread', VexThread);
