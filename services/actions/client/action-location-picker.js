class ActionLocationPicker extends HTMLElement {
  constructor () {
    super();
    this.administrativeHierarchy = null;
    this.selectedBoundary = null;
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
          background: rgb(190, 173, 227);
          color: rgb(90, 90, 90);
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
          position: relative;
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

        .boundary-selector {
          margin-top: 20px;
          display: none;
        }

        .boundary-selector.active {
          display: block;
        }

        .boundary-option {
          padding: 10px;
          margin: 5px 0;
          border: 1px solid #ddd;
          border-radius: 4px;
          cursor: pointer;
          transition: background-color 0.2s;
        }

        .boundary-option:hover {
          background: #f0f0f0;
        }

        .boundary-option.selected {
          background: #007bff;
          color: white;
          border-color: #007bff;
        }

        .boundary-level {
          font-size: 12px;
          color: #666;
          margin-top: 5px;
        }

        .boundary-option.selected .boundary-level {
          color: rgba(255, 255, 255, 0.8);
        }

        .search-container {
          position: relative;
          margin-bottom: 15px;
        }

        .search-input-wrapper {
          display: flex;
          position: relative;
        }

        #location-search {
          flex: 1;
          padding: 8px 12px;
          border: 1px solid #ddd;
          border-radius: 4px 0 0 4px;
          font-size: 14px;
        }

        #search-button {
          padding: 8px 16px;
          border: 1px solid #ddd;
          border-left: none;
          border-radius: 0 4px 4px 0;
          background: #007bff;
          color: white;
          cursor: pointer;
        }

        #search-button:hover {
          background: #0056b3;
        }

        .search-results {
          position: absolute;
          top: 100%;
          left: 0;
          right: 0;
          background: white;
          border: 1px solid #ddd;
          border-top: none;
          border-radius: 0 0 4px 4px;
          max-height: 200px;
          overflow-y: auto;
          z-index: 1001;
          display: none;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .search-results.active {
          display: block;
        }

        .search-result-item {
          padding: 10px;
          cursor: pointer;
          border-bottom: 1px solid #eee;
        }

        .search-result-item:hover {
          background: #f0f0f0;
        }

        .search-result-item:last-child {
          border-bottom: none;
        }

        .search-result-name {
          font-weight: bold;
          margin-bottom: 4px;
        }

        .search-result-details {
          font-size: 12px;
          color: #666;
        }
      </style>
      
      <button class="location-button" title="Pick Location">
        <i class="fas fa-location-dot"></i>
        <span id="location-text">Pick Location</span>
      </button>

      <div class="dialog-overlay">
        <div class="dialog-content">
          <button class="close-button" title="Close">×</button>
          <h2>Pick Location</h2>
          
          <div class="dialog-body">
            <div class="search-container">
              <div class="search-input-wrapper">
                <input type="text" id="location-search" placeholder="Search for a place..." />
                <button id="search-button" type="button">
                  <i class="fas fa-search"></i>
                </button>
              </div>
              <div id="search-results" class="search-results"></div>
            </div>
            
            <div class="boundary-selector" id="boundary-selector">
              <h3>Select Administrative Level</h3>
              <div id="boundary-options"></div>
            </div>
            
            <div class="loading-overlay">
              <div class="spinner"></div>
            </div>

            <div class="buttons">
              <button class="secondary" id="cancel-button">Cancel</button>
              <button class="primary" id="confirm-button" disabled>Confirm Location</button>
            </div>
          </div>
        </div>
      </div>
    `;
    this.addEventListeners();
    this.loadCurrentLocation();
  }

  async loadCurrentLocation () {
    // If there's a selected boundary, show it
    if (this.selectedBoundary) {
      const locationText = this.selectedBoundary.properties.name || 'Location Selected';
      this.shadowRoot.querySelector('#location-text').textContent = locationText;
    }
  }

  toggleDialog () {
    this.isOpen = !this.isOpen;
    const overlay = this.shadowRoot.querySelector('.dialog-overlay');
    overlay.classList.toggle('open', this.isOpen);

    if (this.isOpen) {
      // Reset state when opening
      this.selectedBoundary = null;
      this.locationCoordinates = null;
      this.administrativeHierarchy = null;
      const selector = this.shadowRoot.querySelector('#boundary-selector');
      if (selector) {
        selector.classList.remove('active');
      }
      const searchInput = this.shadowRoot.querySelector('#location-search');
      if (searchInput) {
        searchInput.value = '';
      }
      const searchResults = this.shadowRoot.querySelector('#search-results');
      if (searchResults) {
        searchResults.classList.remove('active');
        searchResults.innerHTML = '';
      }
      this.updateLoadingState();
    }
  }

  updateLoadingState () {
    const loadingOverlay = this.shadowRoot.querySelector('.loading-overlay');
    const confirmButton = this.shadowRoot.querySelector('#confirm-button');

    loadingOverlay.classList.toggle('active', this.isLoading);
    confirmButton.disabled = this.isLoading || !this.selectedBoundary;
  }

  async fetchBoundariesForLocation (lat, lng) {
    try {
      this.isLoading = true;
      this.updateLoadingState();

      // Store coordinates for later use
      this.locationCoordinates = [lng, lat];

      const response = await fetch(`/vex/administrative/point?lat=${lat}&lng=${lng}`, {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to fetch administrative boundaries');
      }

      const data = await response.json();
      this.administrativeHierarchy = data.boundaries;

      // Show boundary selector
      this.renderBoundaryOptions();
    } catch (error) {
      console.error('Error fetching boundaries:', error);
      alert('Failed to fetch administrative boundaries. Please try again.');
    } finally {
      this.isLoading = false;
      this.updateLoadingState();
    }
  }

  renderBoundaryOptions () {
    const selector = this.shadowRoot.querySelector('#boundary-selector');
    const optionsContainer = this.shadowRoot.querySelector('#boundary-options');

    selector.classList.add('active');
    optionsContainer.innerHTML = '';

    // Sort by admin level (lowest to highest)
    const sortedBoundaries = [...this.administrativeHierarchy].sort((a, b) => {
      return Number(a.properties.admin_level) - Number(b.properties.admin_level);
    });

    sortedBoundaries.forEach(boundary => {
      const option = document.createElement('div');
      option.className = 'boundary-option';
      option.dataset.boundaryId = boundary._id;
      option.innerHTML = `
        <div><strong>${boundary.properties.name}</strong></div>
        <div class="boundary-level">Admin Level: ${boundary.properties.admin_level}</div>
      `;

      option.addEventListener('click', () => {
        // Remove previous selection
        optionsContainer.querySelectorAll('.boundary-option').forEach(opt => {
          opt.classList.remove('selected');
        });

        // Select this one
        option.classList.add('selected');
        this.selectedBoundary = boundary;
        this.updateLoadingState();
      });

      optionsContainer.appendChild(option);
    });
  }

  handleConfirmLocation () {
    if (!this.selectedBoundary) {
      alert('Please select an administrative level');
      return;
    }

    if (!this.locationCoordinates) {
      alert('Please search for and select a location');
      return;
    }

    const location = {
      coordinates: this.locationCoordinates,
      administrativeBoundary: this.selectedBoundary
    };

    // Update button text
    this.shadowRoot.querySelector('#location-text').textContent = this.selectedBoundary.properties.name;

    // Dispatch event with location data
    this.dispatchEvent(new CustomEvent('location-selected', {
      bubbles: true,
      composed: true,
      detail: location
    }));

    this.toggleDialog();
  }

  addEventListeners () {
    this.shadowRoot.querySelector('.location-button').addEventListener('click', () => this.toggleDialog());
    this.shadowRoot.querySelector('.close-button').addEventListener('click', () => this.toggleDialog());
    this.shadowRoot.querySelector('#cancel-button').addEventListener('click', () => this.toggleDialog());
    this.shadowRoot.querySelector('#confirm-button').addEventListener('click', () => this.handleConfirmLocation());

    this.shadowRoot.querySelector('.dialog-overlay').addEventListener('click', (e) => {
      if (e.target === e.currentTarget) {
        this.toggleDialog();
      }
    });

    // Search functionality
    const searchInput = this.shadowRoot.querySelector('#location-search');
    const searchButton = this.shadowRoot.querySelector('#search-button');

    // Search on button click
    if (searchButton) {
      searchButton.addEventListener('click', () => {
        const query = searchInput.value.trim();
        if (query) {
          this.searchLocation(query);
        }
      });
    }

    // Search on Enter key
    if (searchInput) {
      searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          const query = searchInput.value.trim();
          if (query) {
            this.searchLocation(query);
          }
        }
      });

      // Hide results when clicking outside
      searchInput.addEventListener('blur', () => {
        // Delay to allow click on results
        setTimeout(() => {
          const resultsContainer = this.shadowRoot.querySelector('#search-results');
          if (resultsContainer) {
            resultsContainer.classList.remove('active');
          }
        }, 200);
      });
    }
  }

  getLocation () {
    return this.selectedBoundary ? {
      coordinates: this.locationCoordinates,
      administrativeBoundary: this.selectedBoundary
    } : null;
  }

  setLocation (location, boundary) {
    if (location && location.coordinates) {
      this.locationCoordinates = location.coordinates;
      this.selectedBoundary = boundary;
      if (boundary && boundary.properties) {
        this.shadowRoot.querySelector('#location-text').textContent = boundary.properties.name;
      } else if (boundary && typeof boundary === 'object' && boundary._id) {
        // If boundary is just an ID reference, fetch it
        fetch(`/vex/administrative/${boundary._id}`)
          .then(res => res.json())
          .then(boundaryData => {
            this.selectedBoundary = boundaryData;
            if (boundaryData.properties) {
              this.shadowRoot.querySelector('#location-text').textContent = boundaryData.properties.name;
            }
          })
          .catch(err => console.error('Error loading boundary:', err));
      }
    }
  }

  async searchLocation (query) {
    if (!query || query.length < 3) {
      return;
    }

    try {
      this.isLoading = true;
      this.updateLoadingState();

      // Use Nominatim (OpenStreetMap) geocoding API
      const baseUrl = 'https://nominatim.openstreetmap.org/search';
      const params = `format=json&polygon_geojson=1&q=${encodeURIComponent(query)}&limit=5`;
      const url = `${baseUrl}?${params}`;
      const response = await fetch(
        url,
        {
          headers: {
            'User-Agent': 'Vex Location Picker' // Required by Nominatim
          }
        }
      );

      if (!response.ok) {
        throw new Error('Search failed');
      }

      const results = await response.json();
      this.displaySearchResults(results);
    } catch (error) {
      console.error('Error searching location:', error);
      alert('Failed to search location. Please try again.');
    } finally {
      this.isLoading = false;
      this.updateLoadingState();
    }
  }

  displaySearchResults (results) {
    const resultsContainer = this.shadowRoot.querySelector('#search-results');
    if (!resultsContainer) {
      return;
    }

    resultsContainer.innerHTML = '';

    if (results.length === 0) {
      resultsContainer.innerHTML = '<div class="search-result-item">No results found</div>';
      resultsContainer.classList.add('active');
      return;
    }

    results.forEach(result => {
      const item = document.createElement('div');
      item.className = 'search-result-item';
      item.innerHTML = `
        <div class="search-result-name">${this.escapeHtml(result.display_name)}</div>
        <div class="search-result-details">Lat: ${result.lat}, Lon: ${result.lon}</div>
      `;

      item.addEventListener('click', () => {
        this.selectSearchResult(result);
      });

      resultsContainer.appendChild(item);
    });

    resultsContainer.classList.add('active');
  }

  selectSearchResult (result) {
    const lat = parseFloat(result.lat);
    const lon = parseFloat(result.lon);

    // Hide search results
    const resultsContainer = this.shadowRoot.querySelector('#search-results');
    if (resultsContainer) {
      resultsContainer.classList.remove('active');
    }

    // Clear search input
    const searchInput = this.shadowRoot.querySelector('#location-search');
    if (searchInput) {
      searchInput.value = result.display_name;
    }

    // Fetch boundaries for the selected location
    this.fetchBoundariesForLocation(lat, lon);
  }

  escapeHtml (text) {
    if (!text) {
      return '';
    }
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

customElements.define('action-location-picker', ActionLocationPicker);

