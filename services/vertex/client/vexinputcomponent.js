class VexInputComponent extends HTMLElement {
  constructor () {
    super();
    this.attachShadow({ mode: 'open' });

    this.shadowRoot.innerHTML = `
            <style>
                .vex-container {
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                    margin: 0 auto;
                    box-sizing: border-box;
                    border: 1px solid #ccc; 
                    border-radius: 11px;
                    padding: 12px;
                }
                .input-row {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                }
                input {
                    width: 100%;
                    padding: 8px 4px;
                    font-size: 16px;
                    border: none;
                    outline: none;
                    background-color: transparent;
                    box-sizing: border-box;
                }
                .reach-row {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                }
                button {
                    min-width: 36px;
                    height: 36px;
                    font-size: 16px;
                    border: none;
                    border-radius: 50%;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-shrink: 0;
                    background-color: #7d0585;
                    color: white;
                }
                button:hover {
                    background-color: #5d0363;
                }
                .hidden {
                    opacity: 0;
                    height: 0;
                    margin-top: 0;
                    margin-bottom: 0;
                    padding-top: 0;
                    padding-bottom: 0;
                    transition: all 0.2s ease;
                }

                .reach-value {
                    color: #7d0585;
                    font-weight: 500;
                    width: 50%;
                    text-align: right;
                }
                ordinal-slider {
                    width: 50%;
                    transition: all 0.2s ease;
                }
            </style>
            <div class="vex-container">
                <div class="input-row">
                    <input type="text" id="vexContent" placeholder="Write your message...">
                </div>
                <div class="reach-row hidden" id="reachRow">
                    <ordinal-slider
                        id="reachSlider"
                        value="City"
                        labels='["Local Action Group","Neighbourhood", "City","Country", "Global"]'
                    ></ordinal-slider>
                    <span class="reach-value" id="reachValue">City</span>
                    <button id="sendButton">→</button>
                </div>
            </div>
        `;

    this.shadowRoot
      .querySelector('#sendButton')
      .addEventListener('click', () => this.sendVex());
    // Add event listener for Enter key
    this.shadowRoot
      .querySelector('#vexContent')
      .addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          this.sendVex();
        }
      });
  }

  connectedCallback () {
    // get parent-vex from attribute, or if not set, set to empty array
    this.parents = [this.getAttribute('parent-vex')] || [];

    // Listen for changes in the reach slider
    const reachSlider = this.shadowRoot.querySelector('#reachSlider');
    const reachValue = this.shadowRoot.querySelector('#reachValue');
    const reachRow = this.shadowRoot.querySelector('#reachRow');
    const input = this.shadowRoot.querySelector('#vexContent');

    // Update on both change and input events
    reachSlider.addEventListener('change', (e) => {
      reachValue.textContent = e.detail.value;
    });

    reachSlider.addEventListener('input', (e) => {
      if (e.detail && e.detail.value) {
        reachValue.textContent = e.detail.value;
      }
    });

    // Show reach controls when input is focused
    input.addEventListener('focus', () => {
      reachRow.classList.remove('hidden');
    });

    // No blur handler needed - controls stay visible once shown
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

    const reachSlider = this.shadowRoot.querySelector('#reachSlider');
    const reach = reachSlider.value.toLowerCase();

    try {
      const response = await fetch('/vex/vertex', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          content,
          parents: this.parents,
          reach
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to send vex');
      }

      const result = await response.json();
      this.shadowRoot.querySelector('#vexContent').value = '';
    } catch (error) {
      alert(`Error: ${error.message}`);
    }
  }
}

customElements.define('vex-input', VexInputComponent);
