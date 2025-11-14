class VexInputComponent extends HTMLElement {
  constructor () {
    super();
    this.attachShadow({ mode: 'open' });
    this.lastEnterTime = 0;
    this.enterDebounceDelay = 500; // 500ms debounce

    this.shadowRoot.innerHTML = `
            <style>
                .vex-container {
                    background-color: #EFDAFFAB;
                    padding: 12px;
                    border-radius: 12px;
                }
                .input-row {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }
                input {
                    flex: 1;
                    background-color: #fff;
                    padding: 8px 12px;
                    font-size: 16px;
                    border: 1px dotted #ccc;
                    border-radius: 15px;
                    outline: none;
                }
                .send-button {
                    width: 36px;
                    height: 36px;
                    border: none;
                    border-radius: 50%;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background-color: #7d0585;
                    color: white;
                    transition: all 0.2s ease;
                }
                .send-button:hover {
                    background-color: #5d0363;
                    transform: scale(1.05);
                }
                .send-button.hidden {
                    opacity: 0;
                    width: 0;
                    margin: 0;
                    padding: 0;
                    pointer-events: none;
                }
                .reach-row {
                    margin-top: 12px;
                    transition: all 0.3s ease;
                    opacity: 1;
                    visibility: visible;
                }
                .reach-row.hidden {
                    margin-top: 0;
                    opacity: 0;
                    visibility: hidden;
                    height: 0;
                }
            </style>
            <div class="vex-container">
                <div class="input-row">
                    <input type="text" id="vexContent" placeholder="Write your message...">
                    <button class="send-button" id="initialSendButton">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M22 2L11 13M22 2L15 22L11 13M11 13L2 9L22 2"/>
                        </svg>
                    </button>
                </div>
                <div class="reach-row hidden" id="reachRow">
                    <stacked-buttons-ordinal-selection
                        id="reachSelector"
                        value=""
                        values='[]'
                        labels='[]'
                    ></stacked-buttons-ordinal-selection>
                </div>
            </div>
        `;

    // Add click outside listener
    document.addEventListener('click', (e) => {
      if (!this.shadowRoot.host.contains(e.target)) {
        this.hideReachSelector();
        this.showInitialSendButton();
      }
    });

    // Prevent clicks inside from triggering the outside click handler
    this.shadowRoot.addEventListener('click', (e) => {
      e.stopPropagation();
    });

    // Add click handler for initial send button
    const initialSendButton = this.shadowRoot.querySelector('#initialSendButton');
    initialSendButton.addEventListener('click', () => {
      const content = this.shadowRoot.querySelector('#vexContent').value.trim();
      if (!content) {
        alert('Please write a message first');
        return;
      }
      this.showReachSelector();
      this.hideInitialSendButton();
    });

    // Add keyboard event handler for input field
    this.shadowRoot.querySelector('#vexContent').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const now = Date.now();
        if (now - this.lastEnterTime < this.enterDebounceDelay) {
          return; // Ignore if too soon after last Enter
        }
        this.lastEnterTime = now;

        const content = this.shadowRoot.querySelector('#vexContent').value.trim();
        if (!content) {
          alert('Please write a message first');
          return;
        }
        if (this.isReachSelectorVisible()) {
          this.sendVex();
        } else {
          this.showReachSelector();
          this.hideInitialSendButton();
        }
      }
    });

    // Add global keyboard handler for when reach selector is visible
    this.keyboardHandler = (e) => {
      if (!this.isReachSelectorVisible()) {
        return;
      }

      switch (e.key) {
      case 'Escape':
        e.preventDefault();
        this.hideReachSelector();
        this.showInitialSendButton();
        // Focus back on input field
        this.shadowRoot.querySelector('#vexContent').focus();
        break;

      case 'ArrowUp':
        e.preventDefault();
        this.moveOrdinalSelection(-1);
        break;

      case 'ArrowDown':
        e.preventDefault();
        this.moveOrdinalSelection(1);
        break;

      case 'Enter':
        e.preventDefault();
        const now = Date.now();
        if (now - this.lastEnterTime < this.enterDebounceDelay) {
          return; // Ignore if too soon after last Enter
        }
        this.lastEnterTime = now;
        this.sendVex();
        break;
      }
    };

    // Add the keyboard handler to the document
    document.addEventListener('keydown', this.keyboardHandler);
  }

  hideInitialSendButton () {
    const sendButton = this.shadowRoot.querySelector('#initialSendButton');
    sendButton.classList.add('hidden');
  }

  showInitialSendButton () {
    const sendButton = this.shadowRoot.querySelector('#initialSendButton');
    sendButton.classList.remove('hidden');
  }

  isReachSelectorVisible () {
    return !this.shadowRoot.querySelector('#reachRow').classList.contains('hidden');
  }

  showReachSelector () {
    const reachRow = this.shadowRoot.querySelector('#reachRow');
    reachRow.classList.remove('hidden');
  }

  hideReachSelector () {
    const reachRow = this.shadowRoot.querySelector('#reachRow');
    reachRow.classList.add('hidden');
  }

  async connectedCallback () {
    this.parents = [this.getAttribute('parent-vex')] || [];

    const reachSelector = this.shadowRoot.querySelector('#reachSelector');
    const input = this.shadowRoot.querySelector('#vexContent');

    const userData = await fetch('/vex/user/me');
    const user = await userData.json();
    const reachValues = user.data.administrativeBoundaries.map(boundary => boundary._id);
    const reachLabels = user.data.administrativeBoundaries.map(boundary => boundary.properties.name);
    const selectedValue = reachValues[reachValues.length - 1];

    this.setOrdinalSelectorValues(reachValues, reachLabels, selectedValue);

    reachSelector.addEventListener('change', (e) => {
      reachSelector.setAttribute('value', e.detail.value);
    });

    reachSelector.addEventListener('send', () => {
      this.sendVex();
      this.hideReachSelector();
      this.showInitialSendButton();
    });
  }

  disconnectedCallback () {
    // Clean up the keyboard event listener
    if (this.keyboardHandler) {
      document.removeEventListener('keydown', this.keyboardHandler);
    }
  }

  setOrdinalSelectorValues (values, labels, value) {
    const selector = this.shadowRoot.querySelector('#reachSelector');
    selector.setAttribute('values', JSON.stringify(values));
    selector.setAttribute('labels', JSON.stringify(labels));
    selector.setAttribute('value', value);
  }

  moveOrdinalSelection (direction) {
    const selector = this.shadowRoot.querySelector('#reachSelector');
    const values = JSON.parse(selector.getAttribute('values') || '[]');
    const currentValue = selector.value;
    const currentIndex = values.indexOf(currentValue);

    if (currentIndex === -1) {
      // If no current selection, start at the first item
      const newIndex = direction > 0 ? 0 : values.length - 1;
      selector.value = values[newIndex];
    } else {
      // Move up or down
      const newIndex = currentIndex + direction;
      if (newIndex >= 0 && newIndex < values.length) {
        selector.value = values[newIndex];
      }
    }
  }

  // listen for changes in the parent-vex attribute
  static get observedAttributes () {
    return ['parent-vex'];
  }
  attributeChangedCallback (name, oldValue, newValue) {
    if (name === 'parent-vex') {
      this.parents = [newValue] || [];
    }
  }

  async sendVex () {
    const content = this.shadowRoot.querySelector('#vexContent').value.trim();
    if (!content) {
      alert('Content cannot be empty!');
      return;
    }

    const reachSelector = this.shadowRoot.querySelector('#reachSelector');
    const selectedReach = reachSelector.value;
    if (!selectedReach) {
      alert('Please select a reach level');
      return;
    }

    // Get all locations at and below the selected level
    const reachValues = JSON.parse(reachSelector.getAttribute('values'));
    const selectedIndex = reachValues.indexOf(selectedReach);
    const selectedLocations = reachValues.slice(selectedIndex);

    try {
      const response = await fetch('/vex/vertex', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          content,
          parents: this.parents,
          locations: selectedLocations
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to send vex');
      }

      const result = await response.json();
      this.shadowRoot.querySelector('#vexContent').value = '';
      this.hideReachSelector();
      this.showInitialSendButton();
    } catch (error) {
      alert(`Error: ${error.message}`);
    }
  }
}

customElements.define('vex-input', VexInputComponent);
