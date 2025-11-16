class GroupEdit extends HTMLElement {
  constructor () {
    super();
    this.groupId = null;
    this.attachShadow({ mode: 'open' });
    this.render();
  }

  static get observedAttributes () {
    return ['group-id', 'open'];
  }

  attributeChangedCallback (name, oldValue, newValue) {
    if (name === 'group-id' && newValue !== oldValue) {
      this.groupId = newValue;
      // Only update form if modal is open
      if (this.isOpen()) {
        this.updateForm();
      }
    }
    // Don't call show()/hide() here as they set the attribute, causing recursion
    // The display is handled by CSS :host([open])
  }

  connectedCallback () {
    // Close on escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen()) {
        this.close();
      }
    });

    // Close on backdrop click
    const backdrop = this.shadowRoot.querySelector('.modal-backdrop');
    if (backdrop) {
      backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop) {
          this.close();
        }
      });
    }

    // Listen for form save events
    const form = this.shadowRoot.querySelector('group-form');
    if (form) {
      form.addEventListener('group-saved', (e) => {
        this.dispatchEvent(new CustomEvent('group-saved', {
          bubbles: true,
          composed: true,
          detail: e.detail
        }));
        this.close();
      });
    }
  }

  isOpen () {
    return this.hasAttribute('open');
  }

  show () {
    if (!this.isOpen()) {
      this.setAttribute('open', '');
      // Update form with group-id if set
      if (this.groupId) {
        // Use setTimeout to ensure form is ready (longer delay for shadow DOM)
        setTimeout(() => this.updateForm(), 200);
      }
    }
  }

  hide () {
    this.removeAttribute('open');
  }

  open (groupId) {
    if (groupId) {
      // Clear previous group first
      const form = this.shadowRoot.querySelector('group-form');
      if (form) {
        form.removeAttribute('group-id');
      }
      // Set new group-id
      this.groupId = groupId;
      this.setAttribute('group-id', groupId);
    }
    this.show();
  }

  close () {
    this.hide();
    // Clear form when closing
    const form = this.shadowRoot.querySelector('group-form');
    if (form) {
      form.removeAttribute('group-id');
      form.shadowRoot.querySelector('form')?.reset();
    }
  }

  updateForm () {
    const form = this.shadowRoot.querySelector('group-form');
    if (form && this.groupId) {
      // Set the attribute, which will trigger the form's attributeChangedCallback
      form.setAttribute('group-id', this.groupId);
    } else if (this.groupId && this.isOpen()) {
      // Form might not be ready yet, try again after a short delay
      // But only if modal is still open (prevent infinite retries)
      // Limit retries to prevent infinite loops
      if (!this._updateRetries) {
        this._updateRetries = 0;
      }
      if (this._updateRetries < 10) {
        this._updateRetries++;
        setTimeout(() => {
          if (this.isOpen()) {
            this.updateForm();
          }
        }, 100);
      } else {
        this._updateRetries = 0;
        console.error('Failed to update form after multiple retries');
      }
    } else {
      this._updateRetries = 0;
    }
  }

  render () {
    this.shadowRoot.innerHTML = `
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.7.1/dist/leaflet.css"/>
      <style>
        :host {
          display: none;
        }
        :host([open]) {
          display: block;
        }
        .modal-backdrop {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          z-index: 1000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }
        .modal-content {
          background: white;
          border-radius: 8px;
          max-width: 900px;
          width: 100%;
          max-height: 90vh;
          overflow-y: auto;
          position: relative;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .modal-header {
          padding: 20px;
          border-bottom: 1px solid #ddd;
          display: flex;
          justify-content: space-between;
          align-items: center;
          position: sticky;
          top: 0;
          background: white;
          z-index: 10;
        }
        .modal-title {
          font-size: 24px;
          font-weight: bold;
          color: #333;
          margin: 0;
        }
        .close-button {
          background: none;
          border: none;
          font-size: 28px;
          cursor: pointer;
          color: #666;
          padding: 0;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 4px;
        }
        .close-button:hover {
          background: #f0f0f0;
          color: #333;
        }
        .modal-body {
          padding: 0;
        }
      </style>
      <div class="modal-backdrop">
        <div class="modal-content">
          <div class="modal-header">
            <h2 class="modal-title">Edit Group</h2>
            <button class="close-button" aria-label="Close">&times;</button>
          </div>
          <div class="modal-body">
            <group-form></group-form>
          </div>
        </div>
      </div>
    `;

    // Add close button handler
    const closeButton = this.shadowRoot.querySelector('.close-button');
    if (closeButton) {
      closeButton.addEventListener('click', () => this.close());
    }

    // Update form if group-id is already set
    if (this.groupId) {
      this.updateForm();
    }
  }
}

customElements.define('group-edit', GroupEdit);

