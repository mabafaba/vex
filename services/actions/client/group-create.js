class GroupCreate extends HTMLElement {
  constructor () {
    super();
    this.attachShadow({ mode: 'open' });
    this.render();
  }

  static get observedAttributes () {
    return ['open'];
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
        // Show success message and close
        this.showSuccess();
        setTimeout(() => {
          this.close();
        }, 1500);
      });
    }
  }

  isOpen () {
    return this.hasAttribute('open');
  }

  show () {
    if (!this.isOpen()) {
      this.setAttribute('open', '');
      // Clear form when opening
      const form = this.shadowRoot.querySelector('group-form');
      if (form) {
        form.removeAttribute('group-id');
        form.shadowRoot.querySelector('form')?.reset();
      }
      // Hide success message if visible
      this.hideSuccess();
    }
  }

  hide () {
    this.removeAttribute('open');
  }

  open () {
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
    this.hideSuccess();
  }

  showSuccess () {
    const successMessage = this.shadowRoot.querySelector('.success-message');
    if (successMessage) {
      successMessage.style.display = 'block';
    }
  }

  hideSuccess () {
    const successMessage = this.shadowRoot.querySelector('.success-message');
    if (successMessage) {
      successMessage.style.display = 'none';
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
          background: #000;
          border-radius: 8px;
          max-width: 900px;
          width: 100%;
          max-height: 90vh;
          overflow-y: auto;
          position: relative;
          box-shadow: 0 4px 6px rgba(138, 43, 226, 0.3);
          border: 2px dashed #8b0000;
        }
        .modal-header {
          padding: 20px;
          border-bottom: 2px dashed #8b0000;
          display: flex;
          justify-content: space-between;
          align-items: center;
          position: sticky;
          top: 0;
          background: #000;
          z-index: 10;
        }
        .modal-title {
          font-size: 24px;
          font-weight: bold;
          color: #8a2be2;
          margin: 0;
          font-family: 'Courier New', monospace;
        }
        .close-button {
          background: rgba(138, 43, 226, 0.3);
          border: 1px dashed #8b0000;
          font-size: 28px;
          cursor: pointer;
          color: #fff;
          padding: 0;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 4px;
          font-family: 'Courier New', monospace;
        }
        .close-button:hover {
          background: rgba(138, 43, 226, 0.5);
          border-color: #8a2be2;
        }
        .modal-body {
          padding: 0;
        }
        .success-message {
          display: none;
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background: rgba(0, 200, 0, 0.9);
          color: white;
          padding: 20px 40px;
          border-radius: 8px;
          z-index: 2000;
          font-family: 'Courier New', monospace;
          font-size: 18px;
          font-weight: bold;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
        }
      </style>
      <div class="modal-backdrop">
        <div class="modal-content">
          <div class="modal-header">
            <h2 class="modal-title">Create Group</h2>
            <button class="close-button" aria-label="Close">&times;</button>
          </div>
          <div class="modal-body">
            <group-form></group-form>
          </div>
        </div>
      </div>
      <div class="success-message">Group created successfully!</div>
    `;

    // Add close button handler
    const closeButton = this.shadowRoot.querySelector('.close-button');
    if (closeButton) {
      closeButton.addEventListener('click', () => this.close());
    }
  }
}

customElements.define('group-create', GroupCreate);

