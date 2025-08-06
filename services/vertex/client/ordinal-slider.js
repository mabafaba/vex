class OrdinalSlider extends HTMLElement {
  constructor () {
    super();
    this.attachShadow({ mode: 'open' });
    this._labels = [];
    this._values = [];
    this._isDragging = false;
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
    // Use values array if available, otherwise fallback to labels
    const currentIndex = this._values.length > 0 ?
      this._values.indexOf(this._value) :
      this._labels.indexOf(this._value);

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          width: 100%;
          padding: 10px 0;
        }
        .slider-container {
          display: flex;
          flex-direction: column;
          gap: 5px;
          position: relative;
        }
        .tooltip {
          position: absolute;
          top: -25px; 
          left: 50%; 
          transform: translateX(-50%);
          padding-left:5px;
          padding-right:5px;
          height: 20px;
          background: #7d0585;
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          pointer-events: none;
          opacity: ${this._isDragging ? '1' : '0'}; 
          transition: opacity 0.2s ease;
          z-index: 2; 
        }
        .tooltip-text {
          color: white;
          font-size: 12px;
          white-space: nowrap;
        }
        .slider-wrapper {
          position: relative;
          padding: 0 8px; 
          height: 16px; 
        }
       .position-markers {
         position: absolute;
         top: 50%;
         left: 8px; 
         right: 8px; 
         height: 4px; 
         transform: translateY(-50%);
         pointer-events: none;
         z-index: 0; 
       }
       .marker {
         position: absolute;
         top: 50%;
         transform: translate(-50%, -50%); 
         width: 8px;
         height: 8px;
         background-color: #cccccc; 
         border-radius: 50%;
       }
        .label-container {
          display: flex;
          justify-content: space-between;
          padding: 0 8px;
          margin-top: 4px;
        }
        .label-text {
          font-size: 10px;
          color: #888888;
          text-align: center;
          flex: 1;
          min-width: 0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .label-text:first-child {
          text-align: left;
        }
        .label-text:last-child {
          text-align: right;
        }
        input[type="range"] {
          width: 100%;
          margin: 0;
          -webkit-appearance: none;
          background: transparent; 
          position: relative;
          z-index: 1; 
        }
        input[type="range"]::-webkit-slider-runnable-track {
          width: 100%;
          height: 4px;
          background: #cccccc;
          border-radius: 2px;
          cursor: pointer;
        }
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 16px;
          height: 16px;
          background: #7d0585;
          border-radius: 50%;
          cursor: pointer;
          margin-top: -6px; 
          position: relative; 
          z-index: 1; 
        }
        input[type="range"]::-moz-range-track {
          width: 100%;
          height: 4px;
          background: #cccccc;
          border-radius: 2px;
          cursor: pointer;
        }
        input[type="range"]::-moz-range-thumb {
          width: 16px;
          height: 16px;
          background: #7d0585;
          border-radius: 50%;
          cursor: pointer;
          border: none;
          position: relative; 
          z-index: 1; 
        }
       </style>
       <div class="slider-container">
         <div class="tooltip">
           <span class="tooltip-text">${this._labels[currentIndex]}</span>
         </div>
         <div class="slider-wrapper">
          <div class="position-markers"></div>
           <input 
             type="range" 
             min="0" 
             max="${this._labels.length - 1}" 
             value="${currentIndex}"
             step="1"
           >
         </div>
         <div class="label-container"></div>
       </div>
     `;

    // Add markers dynamically
    const markerContainer = this.shadowRoot.querySelector('.position-markers');
    if (markerContainer && this._labels.length > 1) {
      this._labels.forEach((label, index) => {
        if (index !== currentIndex) {
          const marker = document.createElement('div');
          marker.classList.add('marker');
          const positionPercentage = (index / (this._labels.length - 1)) * 100;
          marker.style.left = `${positionPercentage}%`;
          markerContainer.appendChild(marker);
        }
      });
    }

    // Add labels dynamically
    const labelContainer = this.shadowRoot.querySelector('.label-container');
    if (labelContainer && this._labels.length > 0) {
      this._labels.forEach(label => {
        const labelElement = document.createElement('span');
        labelElement.classList.add('label-text');
        labelElement.textContent = label;
        labelContainer.appendChild(labelElement);
      });
    }

    const input = this.shadowRoot.querySelector('input');
    let startIndex = currentIndex;

    input.addEventListener('mousedown', () => {
      this._isDragging = true;
      startIndex = this._values.length > 0 ?
        this._values.indexOf(this._value) :
        this._labels.indexOf(this._value);
      this.updateTooltip();
    });

    input.addEventListener('mouseup', () => {
      this._isDragging = false;
      const currentValIndex = this._values.length > 0 ?
        this._values.indexOf(this._value) :
        this._labels.indexOf(this._value);
      const newIndex = Math.round(parseFloat(input.value));
      if (newIndex !== currentValIndex) {
        const newValue = this._values.length > 0 ? this._values[newIndex] : this._labels[newIndex];
        this.value = newValue;
        this.dispatchEvent(new CustomEvent('change', {
          detail: {
            value: newValue,
            label: this._labels[newIndex]
          }
        }));
      } else {
        input.value = currentValIndex;
      }
      this.updateTooltip();
    });

    input.addEventListener('input', (e) => {
      const newIndex = parseFloat(e.target.value);
      if (this._isDragging) {
        const newValue = this._values.length > 0 ? this._values[Math.round(newIndex)] : this._labels[Math.round(newIndex)];
        this.updateTooltip(newValue);
        this.dispatchEvent(new CustomEvent('input', {
          detail: {
            value: newValue,
            label: this._labels[Math.round(newIndex)]
          }
        }));
      }
    });
  }

  updateTooltip (value = this._value) {
    const tooltip = this.shadowRoot.querySelector('.tooltip');
    const tooltipText = this.shadowRoot.querySelector('.tooltip-text');
    if (!tooltip || !tooltipText) {
      return;
    }

    const index = this._values.length > 0 ?
      this._values.indexOf(value) :
      this._labels.indexOf(value);
    const positionPercentage = (index / (this._labels.length - 1)) * 100;

    tooltip.style.left = `${positionPercentage}%`;
    tooltip.style.opacity = this._isDragging ? '1' : '0';
    tooltipText.textContent = this._labels[index];

    if (this._isDragging) {
      this.dispatchEvent(new CustomEvent('input', {
        detail: {
          value: value,
          label: this._labels[index]
        }
      }));
    }
  }
}

customElements.define('ordinal-slider', OrdinalSlider);
