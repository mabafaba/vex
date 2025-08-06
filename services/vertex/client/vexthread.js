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
          padding: 0.5em;
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
    // Listen for breadcrumb navigation
    this.shadowRoot
      .getElementById('breadcrumbs')
      .addEventListener('crumb-click', (event) => {
        const clickedVexId = event.detail.vexId;
        this.setAttribute('vex-id', clickedVexId);
        // Optionally update URL
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.set('id', clickedVexId);
        window.history.pushState({}, '', newUrl);
      });
    // Listen for clicks on vex-list items (if you emit events from vex-list)
    // You may need to forward events from vex-display in vex-list for this to work
    // this.shadowRoot.getElementById('vex-list').onClick = (event) => {
    //   if (event && event.detail && event.detail.vexId) {
    //     this.setAttribute('vex-id', event.detail.vexId);
    //     const newUrl = new URL(window.location.href);
    //     newUrl.searchParams.set('id', event.detail.vexId);
    //     window.history.pushState({}, '', newUrl);
    //   }
    // };
    // add event listener for vex-list-unauthorized
    const vexList = this.shadowRoot.getElementById('vex-list');
    vexList.addEventListener('vex-list-unauthorized', () => {
      this.shadowRoot.innerHTML = '';
    });
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
