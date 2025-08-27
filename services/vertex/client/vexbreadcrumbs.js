class VexBreadcrumbs extends HTMLElement {
  constructor () {
    super();
    this.attachShadow({ mode: 'open' });
    this.state = {
      ancestryData: [],
      vexId: null
    };

    // Bind methods
    this.fetchAncestryData = this.fetchAncestryData.bind(this);
    this.handleCrumbClick = this.handleCrumbClick.bind(this);
  }

  static get observedAttributes () {
    return ['vex-id'];
  }

  attributeChangedCallback (name, oldValue, newValue) {
    if (name === 'vex-id' && newValue !== oldValue) {
      this.state.vexId = newValue;
      this.fetchAncestryData();
    }
  }

  async fetchAncestryData () {
    if (!this.state.vexId) {
      return;
    }

    try {
      const response = await fetch(
        '/vex/vertex/' + this.state.vexId + '/ancestry'
      );
      if (!response.ok && response.status !== 401) {
        throw new Error(`Failed to fetch ancestry: ${response.statusText}`);
      }
      if (response.status === 401) {
        this.shadowRoot.innerHTML = ''; // Clear the breadcrumbs
        this.dispatchEvent(new CustomEvent('vex-breadcrumbs-unauthorized'));
        return;
      }

      this.state.ancestryData = await response.json();
      this.render();
    } catch (error) {
      // console.error("Error fetching ancestry data:", error);
      this.shadowRoot.innerHTML = '<div class="error">Error loading ancestry data</div>';
      // Hide breadcrumbs if unauthorized (401 status)
    }
  }

  handleCrumbClick (event, vexId) {
    // Prevent default link behavior
    event.preventDefault();

    // Create and dispatch a custom event with the vex ID
    const crumbClickEvent = new CustomEvent('breadcrumb-click', {
      detail: { vexId },
      bubbles: true,
      composed: true // Allows the event to pass through shadow DOM boundaries
    });

    this.dispatchEvent(crumbClickEvent);
  }

  render () {
    const { ancestryData } = this.state;

    this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: block;
                    margin-bottom: 20px;
                    font-size: 8px;
                    min-height: 1em;
                    
                }
                
                .breadcrumb-link {
                      margin-top: 10px;
    display: inline-block;
    color: #333;
    text-decoration: none;
    cursor: pointer;
    margin-right: 5px;
    padding: 4px 8px;
    background: rgb(224, 222, 253);
    border-radius: 11px;
    max-width: 100%;
    box-sizing: border-box; /* ensures padding is included in width */
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    vertical-align: top;
                }
                
                .breadcrumb-link:hover {
                    text-decoration: underline;
                    background: rgb(234, 232, 255);
                }
                
                .breadcrumb-separator {
                    margin: 0 5px;
                    color: #9e9e9e;
                    display:none;
                }

                .breadcrumbs-container {
                  min-height: 27px;
                  width: 100%;
                  /* padding: 0.5em; */
                  display: block;
                  overflow: hidden;
                  width:100%;
                }
            </style>
            
            <div class="breadcrumbs-container">
                ${ancestryData
    .map((item, index) => {
      return `
                        <span class="breadcrumb-link" data-vex-id="${
  item.id
}">${item.content}</span>
                        ${
  index < ancestryData.length - 1
    ? '<span class="breadcrumb-separator">></span>'
    : ''
}
                    `;
    })
    .join('')}
            </div>
        `;

    // Add event listeners to the breadcrumb links
    const breadcrumbLinks =
      this.shadowRoot.querySelectorAll('.breadcrumb-link');
    breadcrumbLinks.forEach((link) => {
      const vexId = link.getAttribute('data-vex-id');
      link.addEventListener('click', (event) =>
        this.handleCrumbClick(event, vexId)
      );
    });
  }

  connectedCallback () {
    const vexId = this.getAttribute('vex-id');
    if (vexId) {
      this.state.vexId = vexId;
      this.fetchAncestryData();
    }
  }
}

customElements.define('vex-breadcrumbs', VexBreadcrumbs);
