class LocationPickerDialog extends HTMLElement {
  constructor () {
    super();
    this.administrativeHierarchy = null;
    this.isOpen = false;
    this.isLoading = false;
    this.attachShadow({ mode: 'open' });
    this.render();
  }

  render () {
    this.shadowRoot.innerHTML = `
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css">
      
      <style>
        .location-button {
          background:rgb(190, 173, 227);
          color:rgb(90, 90, 90);
          border: none;
          border-radius: 25px;
          padding: 8px 16px;
          font-size: 12px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: background-color 0.2s;
          box-shadow: 0 2px 5px rgba(0,0,0,0.2);
          margin: auto;
          min-width: 120px;
        }

        .location-button:hover {
          background: #7b62b3;
        }

        .location-button i {
          font-size: 14px;
        }

        .location-button span {
          font-size: 12px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .dialog-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          background: rgba(0, 0, 0, 0.5);
          display: none;
          justify-content: center;
          align-items: center;
          z-index: 1000;
        }
        
        .dialog-overlay.open {
          display: flex;
        }
        
        .dialog-content {
          background: white;
          padding: 20px;
          border-radius: 8px;
          max-width: 600px;
          width: 90%;
          max-height: 90vh;
          overflow-y: auto;
          position: fixed;
          margin: 0 auto;
          top: 20px;
        }
        
        h2 {
          margin-top: 0;
        }
        
        .loading-overlay {
          display: none;
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          /* background: rgba(255, 255, 255, 0.9); */
          background: #FFF;
          justify-content: center;
          align-items: center;
          z-index: 10000;
        }

        .loading-overlay.active {
          display: flex;
        }

        .spinner {
          width: 40px;
          height: 40px;
          border: 4px solid #f3f3f3;
          border-top: 4px solid #634E8F;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .buttons {
          margin-top: 20px;
          display: flex;
          justify-content: flex-end;
          gap: 10px;
        }
        
        button {
          padding: 8px 16px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
        }
        
        button.primary {
          background: #007bff;
          color: white;
        }
        
        button.secondary {
          background: #6c757d;
          color: white;
        }

        .close-button {
          position: absolute;
          top: 10px;
          right: 10px;
          background: none;
          border: none;
          font-size: 20px;
          cursor: pointer;
          padding: 5px;
          color: #666;
        }

        .close-button:hover {
          color: #333;
        }
      </style>
      
      <button class="location-button" title="Pick Location">
        <i class="fas fa-location-dot"></i>
        <span>Pick Location</span>
      </button>

      <div class="dialog-overlay">
        <div class="dialog-content">
          <button class="close-button" title="Close">×</button>
          <h2>Pick Your Location</h2>
          
          <div class="dialog-body">
            <p>Click on the map to select your location</p>
            <leaflet-location-picker
              mapwidth="100%"
              mapheight="400px"
              zoom="1">
            </leaflet-location-picker>
            
            <div class="loading-overlay">
              <div class="spinner"></div><br>
            </div>

            <div class="buttons">
              <button class="primary" id="confirm-button">Confirm Location</button>
            </div>
          </div>
        </div>
      </div>
    `;
    this.addEventListeners();
    this.loadCurrentLocation();
  }

  async loadCurrentLocation () {
    console.log('loading current location');
    try {
      const response = await fetch('/vex/user/me', {
        credentials: 'include'
      });
      if (response.ok) {
        const userData = await response.json();
        if (userData.data?.administrativeBoundaries) {
          const location = userData.data.administrativeBoundaries
            .sort((a, b) => Number(a.properties.admin_level) - Number(b.properties.admin_level))
            .map(b => b.properties.name)
            .pop();

          // store the hierarchy
          this.administrativeHierarchy = userData.data.administrativeBoundaries;

          this.shadowRoot.querySelector('.location-button span').textContent = location || 'Pick Location';
        }
      }
    } catch (error) {
      console.error('Error loading current location:', error);
    }
  }

  toggleDialog () {
    this.isOpen = !this.isOpen;
    const overlay = this.shadowRoot.querySelector('.dialog-overlay');
    overlay.classList.toggle('open', this.isOpen);

    if (this.isOpen) {
      requestAnimationFrame(() => {
        const locationPicker = this.shadowRoot.querySelector('leaflet-location-picker');
        if (locationPicker && locationPicker.map) {
          locationPicker.map.invalidateSize();
        }
      });
    }
  }

  updateLoadingState () {
    const loadingOverlay = this.shadowRoot.querySelector('.loading-overlay');
    const confirmButton = this.shadowRoot.querySelector('#confirm-button');

    loadingOverlay.classList.toggle('active', this.isLoading);
    confirmButton.disabled = this.isLoading;
  }

  async handleConfirmLocation () {
    const locationPicker = this.shadowRoot.querySelector('leaflet-location-picker');
    try {
      this.isLoading = true;
      this.updateLoadingState();

      const location = await locationPicker.location();
      const response = await fetch(`/vex/administrative/point?lat=${location.lat}&lng=${location.lng}`);

      if (!response.ok) {
        throw new Error('Failed to fetch administrative boundaries');
      }

      const data = await response.json();
      this.administrativeHierarchy = data.boundaries;

      // Save the location
      const updateResponse = await fetch('/vex/user/me', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          data: {
            administrativeBoundaries: this.administrativeHierarchy
          }
        }),
        credentials: 'include'
      });

      if (!updateResponse.ok) {
        throw new Error('Failed to update user data');
      }

      this.dispatchEvent(new CustomEvent('location-saved', {
        bubbles: true,
        composed: true
      }));

      await this.loadCurrentLocation();
      this.toggleDialog();
    } catch (error) {
      console.error('Error saving location:', error);
      alert('Failed to save location. Please try again.');
    } finally {
      this.isLoading = false;
      this.updateLoadingState();
    }
  }

  addEventListeners () {
    this.shadowRoot.querySelector('.location-button').addEventListener('click', () => this.toggleDialog());
    this.shadowRoot.querySelector('.close-button').addEventListener('click', () => this.toggleDialog());
    this.shadowRoot.querySelector('#confirm-button').addEventListener('click', () => this.handleConfirmLocation());

    this.shadowRoot.querySelector('.dialog-overlay').addEventListener('click', (e) => {
      if (e.target === e.currentTarget) {
        this.toggleDialog();
      }
    });
  }
}

customElements.define('location-picker-dialog', LocationPickerDialog);
