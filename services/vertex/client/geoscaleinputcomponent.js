class GeoTextInputComponent extends HTMLElement {
  constructor () {
    super();
    this.attachShadow({ mode: 'open' });

    this.shadowRoot.innerHTML = `
            <style>
                .vex-container {
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                    max-width: 400px;
                    margin: 0 auto;
                }
                textarea {
                    width: 100%;
                    height: 100px;
                    padding: 10px;
                    font-size: 16px;
                    border: 1px solid #ccc;
                    border-radius: 5px;
                }
                button {
                    padding: 10px;
                    font-size: 16px;
                    background-color: #007BFF;
                    color: white;
                    border: none;
                    border-radius: 5px;
                    cursor: pointer;
                }
                button:hover {
                    background-color: #0056b3;
                }
            </style>
            <div class="vex-container">
                <div class="ordinal-slider">
                    <label for="ordinalSlider">Select an option:</label>
                    <input type="range" id="ordinalSlider" min="1" max="5" step="1" value="1">
                    <div class="labels">
                        <span>Option 1</span>
                        <span>Option 2</span>
                        <span>Option 3</span>
                        <span>Option 4</span>
                        <span>Option 5</span>
                    </div>
                </div>
                <script>
                    const slider = this.shadowRoot.querySelector('#ordinalSlider');
                    const labels = this.shadowRoot.querySelectorAll('.labels span');
                    slider.addEventListener('input', () => {
                        labels.forEach((label, index) => {
                            label.style.fontWeight = index + 1 === parseInt(slider.value) ? 'bold' : 'normal';
                        });
                    });
                </script>
                <style>
                    .ordinal-slider {
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        gap: 5px;
                    }
                    .labels {
                        display: flex;
                        justify-content: space-between;
                        width: 100%;
                    }
                    .labels span {
                        flex: 1;
                        text-align: center;
                    }
                </style>
                <textarea id="vexContent" placeholder="Write your vex here..."></textarea>
                <button id="sendButton">Send</button>
            </div>
        `;

    this.shadowRoot.querySelector('#sendButton').addEventListener('click', () => this.sendVex());
  }

  connectedCallback () {
    // get parent-vex from attribute, or if not set, set to empty array
    this.parents = JSON.parse(this.getAttribute('parent-vex')) || [];
  }

  // listen for changes in the parent-vex attribute
  static get observedAttributes () {
    return ['parent-vex'];
  }
  attributeChangedCallback (name, oldValue, newValue) {
    if (name === 'parent-vex') {
      this.parents = JSON.parse(newValue);
    }
  }

  async sendVex () {
    const content = this.shadowRoot.querySelector('#vexContent').value.trim();
    if (!content) {
      alert('Content cannot be empty!');
      return;
    }

    try {
      const response = await fetch('/vex/vertex', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ content, parents: this.parents })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to send vex');
      }

      console.log(response);

      const result = await response.json();
      this.shadowRoot.querySelector('#vexContent').value = '';
    } catch (error) {
      alert(`Error: ${error.message}`);
    }
  }
}

customElements.define('placed-text-input', GeoTextInputComponent);
