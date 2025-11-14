class VexSortControls extends HTMLElement {
  constructor () {
    super();
    this.attachShadow({ mode: 'open' });
    this._currentSort = 'date';
  }

  static get observedAttributes () {
    return ['current-sort'];
  }

  attributeChangedCallback (name, oldValue, newValue) {
    if (name === 'current-sort' && oldValue !== newValue) {
      this._currentSort = newValue;
      this.render();
    }
  }

  set vexList (el) {
    this._vexList = el;
    if (el && typeof el.sortBy === 'function') {
      el.sortBy(this._currentSort);
    }
  }

  get vexList () {
    return this._vexList;
  }

  render () {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          background: white;
          border-top: 1px solid #eee;
          padding: 8px 0;
        }
        .sort-tabs {
          display: flex;
          justify-content: space-around;
          max-width: 400px;
          margin: 0 auto;
        }
        .sort-tab {
          flex: 1;
          text-align: center;
          padding: 8px;
          color: #666;
          cursor: pointer;
          font-size: 14px;
          transition: all 0.2s ease;
        }
        .sort-tab.active {
          color: #7d0585;
          font-weight: 500;
        }
        .sort-tab:hover {
          color: #7d0585;
        }
      </style>
      <div class="sort-tabs">
        <div class="sort-tab ${this._currentSort === 'date' ? 'active' : ''}" data-sort="date">
          Newest
        </div>
        <div class="sort-tab ${this._currentSort === 'hot' ? 'active' : ''}" data-sort="hot">
          Hot
        </div>
        <div class="sort-tab ${this._currentSort === 'upvotes' ? 'active' : ''}" data-sort="upvotes">
          Top
        </div>
      </div>
    `;

    const tabs = this.shadowRoot.querySelectorAll('.sort-tab');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const sort = tab.dataset.sort;
        this._currentSort = sort;
        this.render();
        if (this._vexList && typeof this._vexList.sortBy === 'function') {
          this._vexList.sortBy(sort);
        }
      });
    });
  }

  connectedCallback () {
    this.render();
  }
}

customElements.define('vex-sort-controls', VexSortControls);
