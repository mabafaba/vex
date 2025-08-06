class StackedButtonsOrdinalSelection extends HTMLElement {
  constructor () {
    super();
    this.attachShadow({ mode: 'open' });
    this._labels = [];
    this._values = [];
    this._value = null;
  }

  static get observedAttributes () {
    return ['value', 'labels', 'values'];
  }

  attributeChangedCallback (name, oldValue, newValue) {
    if (oldValue === newValue) {
      return;
    }

    switch (name) {
    case 'value':
      this._value = newValue;
      break;
    case 'labels':
      this._labels = JSON.parse(newValue || '[]');
      break;
    case 'values':
      this._values = JSON.parse(newValue || '[]');
      break;
    }
    this.render();
  }

  connectedCallback () {
    this.render();
  }

  get value () {
    return this._value;
  }

  set value (newValue) {
    if (this._values.includes(newValue)) {
      this._value = newValue;
      this.setAttribute('value', newValue);
      this.render();
    }
  }

  render () {
    const currentIndex = this._values.length > 0 ?
      this._values.indexOf(this._value) :
      this._labels.indexOf(this._value);

    const totalButtons = this._labels.length;

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          width: 100%;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        }
        .container {
          background: white;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        .buttons-container {
          display: flex;
          flex-direction: column;
        }
        .button {
          width: 100%;
          padding: 12px;
          font-size: 16px;
          text-align: center;
          background: white;
          border: none;
          cursor: pointer;
          transition: all 0.2s ease;
          color: #000;
          /* position: relative; */
        }
        .button::after {
          content: '';
          position: absolute;
          bottom: 0;
          left: 8px;
          right: 8px;
          height: 1px;
          background: #eee;
        }
        .button:last-child::after {
          display: none;
        }
        .button:hover {
          /* filter: brightness(0.95); */
        }

        ${this._labels.map((_, index) => {
    const reverseIndex = totalButtons - index - 1;
    const lightness = 95 - (reverseIndex * (95 - 65) / (totalButtons - 1));
    const selectedSaturation = 60 + (reverseIndex * (100 - 60) / (totalButtons - 1));
    const selectedLightness = 45 - (reverseIndex * (45 - 25) / (totalButtons - 1));

    return `
          .button:nth-child(${index + 1}) {
            background: hsl(293, 0%, ${100}%);
          }
          .button:nth-child(${index + 1}).selected {
            background: hsl(293, ${selectedSaturation}%, ${selectedLightness}%);
            color: white;
          }
          `;
  }).join('\n')}

        .send-button {
          width: 100%;
          padding: 12px;
          font-size: 16px;
          background: #000;
          color: white;
          border: none;
          border-radius: 0 0 12px 12px;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }
        .send-button:hover {
          background: #333;
        }
        .send-button svg {
          width: 16px;
          height: 16px;
        }
        .send-button.disabled {
          background: #999;
          cursor: not-allowed;
        }
      </style>
      <div class="container">
        <div class="buttons-container">
          ${this._labels.map((label, index) => `
            <button class="button ${index >= currentIndex && currentIndex !== -1 ? 'selected' : ''}"
                    data-value="${this._values[index] || label}"
                    data-index="${index}">
              ${label}
            </button>
          `).join('')}
        </div>
        <button class="send-button ${currentIndex === -1 ? 'disabled' : ''}" ${currentIndex === -1 ? 'disabled' : ''}>
          Send
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 2L11 13M22 2L15 22L11 13M11 13L2 9L22 2"/>
          </svg>
        </button>
      </div>
    `;

    // Add click handlers
    this.shadowRoot.querySelectorAll('.button').forEach(button => {
      button.addEventListener('click', (e) => {
        const value = button.dataset.value;
        const index = parseInt(button.dataset.index);

        this._value = value;
        this.setAttribute('value', value);

        // Update all buttons based on the selected index
        this.shadowRoot.querySelectorAll('.button').forEach((btn, btnIndex) => {
          if (btnIndex >= index) {
            btn.classList.add('selected');
          } else {
            btn.classList.remove('selected');
          }
        });

        // Enable send button
        const sendButton = this.shadowRoot.querySelector('.send-button');
        sendButton.classList.remove('disabled');
        sendButton.disabled = false;

        // Dispatch both input and change events to match ordinal-slider behavior
        this.dispatchEvent(new CustomEvent('input', {
          detail: {
            value: value,
            label: this._labels[index]
          }
        }));

        this.dispatchEvent(new CustomEvent('change', {
          detail: {
            value: value,
            label: this._labels[index]
          }
        }));
      });
    });

    // Add send button handler
    this.shadowRoot.querySelector('.send-button').addEventListener('click', () => {
      if (this._value) {
        const index = this._values.indexOf(this._value);
        console.log('send', this._value, this._labels[index]);
        this.dispatchEvent(new CustomEvent('send', {
          detail: {
            value: this._value,
            label: this._labels[index]
          }
        }));
      }
    });
  }
}

customElements.define('stacked-buttons-ordinal-selection', StackedButtonsOrdinalSelection);
