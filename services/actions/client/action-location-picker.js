class ActionLocationPicker extends HTMLElement {
  constructor () {
    super();
    this.selectedLocations = []; // Array of Nomatim result objects
    this.suggestions = [];
    this.isLoading = false;
    this.attachShadow({ mode: 'open' });
    this.render();
  }

  render () {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          width: 100%;
        }
        .location-selector-container {
          border: 1px solid #ddd;
          border-radius: 4px;
          padding: 8px;
          min-height: 40px;
          background: transparent;
          position: relative;
        }
        .locations-container {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-bottom: 6px;
        }
        .location-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: #007bff;
          color: white;
          padding: 4px 8px;
          border-radius: 16px;
          font-size: 14px;
        }
        .location-pill .location-name {
          max-width: 300px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .location-pill .remove-btn {
          background: rgba(255, 255, 255, 0.3);
          border: none;
          color: white;
          border-radius: 50%;
          width: 18px;
          height: 18px;
          cursor: pointer;
          font-size: 12px;
          line-height: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0;
          flex-shrink: 0;
        }
        .location-pill .remove-btn:hover {
          background: rgba(255, 255, 255, 0.5);
        }
        .search-container {
          display: flex;
          gap: 4px;
          position: relative;
        }
        #location-search-input {
          flex: 1;
          border: none;
          outline: none;
          padding: 4px 0;
          font-size: 14px;
        }
        #location-search-button {
          padding: 4px 12px;
          background: #007bff;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
          white-space: nowrap;
        }
        #location-search-button:hover {
          background: #0056b3;
        }
        #location-search-button:disabled {
          background: #ccc;
          cursor: not-allowed;
        }
        .suggestions-dropdown {
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
          z-index: 1000;
          display: none;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .suggestions-dropdown.show {
          display: block;
        }
        .suggestion-item {
          padding: 8px 12px;
          cursor: pointer;
          border-bottom: 1px solid #f0f0f0;
        }
        .suggestion-item:hover {
          background: #f5f5f5;
        }
        .suggestion-item:last-child {
          border-bottom: none;
        }
        .suggestion-item.highlighted {
          background: #007bff;
          color: white;
        }
        .suggestion-item.highlighted:hover {
          background: #0056b3;
        }
        .suggestion-name {
          font-weight: bold;
          margin-bottom: 4px;
        }
        .suggestion-details {
          font-size: 12px;
          opacity: 0.8;
        }
        .no-suggestions {
          padding: 8px 12px;
          color: #666;
          font-style: italic;
        }
        .loading {
          padding: 8px 12px;
          color: #666;
          font-style: italic;
        }
      </style>
      <div class="location-selector-container">
        <div class="locations-container" id="locations-container"></div>
        <div class="search-container">
          <input 
            type="text" 
            id="location-search-input" 
            placeholder="Search for a place..."
            autocomplete="off"
          />
          <button id="location-search-button" type="button">Search</button>
          <div class="suggestions-dropdown" id="suggestions-dropdown"></div>
        </div>
      </div>
    `;

    this.setupEventListeners();
    this.updateLocationsDisplay();
  }

  setupEventListeners () {
    const input = this.shadowRoot.querySelector('#location-search-input');
    const button = this.shadowRoot.querySelector('#location-search-button');

    // Search on button click
    button.addEventListener('click', () => {
      const query = input.value.trim();
      if (query.length >= 3) {
        this.searchLocation(query);
      }
    });

    // Search on Enter key
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const query = input.value.trim();
        if (query.length >= 3) {
          this.searchLocation(query);
        }
      }
    });

    // Click outside to close suggestions
    document.addEventListener('click', (e) => {
      if (!this.shadowRoot.contains(e.target)) {
        this.hideSuggestions();
      }
    });
  }

  async searchLocation (query) {
    if (!query || query.length < 3) {
      return;
    }

    try {
      this.isLoading = true;
      this.updateSearchButton();
      // Use Nominatim (OpenStreetMap) geocoding API
      const baseUrl = 'https://nominatim.openstreetmap.org/search';
      const params = `format=json&polygon_geojson=1&q=${encodeURIComponent(query)}&limit=10`;
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
      this.suggestions = results;
      this.isLoading = false;
      this.updateSearchButton();
      this.renderSuggestions();
      this.showSuggestions();
    } catch (error) {
      console.error('Error searching location:', error);
      this.suggestions = [];
      this.isLoading = false;
      this.updateSearchButton();
      this.renderSuggestions();
      this.showSuggestions();
    }
  }

  updateSearchButton () {
    const button = this.shadowRoot.querySelector('#location-search-button');
    button.disabled = this.isLoading;
    button.textContent = this.isLoading ? 'Searching...' : 'Search';
  }

  renderSuggestions () {
    const dropdown = this.shadowRoot.querySelector('#suggestions-dropdown');
    dropdown.innerHTML = '';

    if (this.isLoading) {
      const loading = document.createElement('div');
      loading.className = 'loading';
      loading.textContent = 'Searching...';
      dropdown.appendChild(loading);
      return;
    }

    if (this.suggestions.length === 0) {
      const noResults = document.createElement('div');
      noResults.className = 'no-suggestions';
      noResults.textContent = 'No results found';
      dropdown.appendChild(noResults);
      return;
    }

    this.suggestions.forEach((result, index) => {
      const item = document.createElement('div');
      item.className = 'suggestion-item';
      item.innerHTML = `
        <div class="suggestion-name">${this.escapeHtml(result.display_name)}</div>
        <div class="suggestion-details">Lat: ${result.lat}, Lon: ${result.lon}</div>
      `;
      item.dataset.index = index;

      item.addEventListener('click', () => {
        this.selectLocation(result);
      });

      dropdown.appendChild(item);
    });
  }

  showSuggestions () {
    const dropdown = this.shadowRoot.querySelector('#suggestions-dropdown');
    const input = this.shadowRoot.querySelector('#location-search-input');
    const hasText = input.value.trim().length > 0;

    if (hasText && (this.suggestions.length > 0 || this.isLoading)) {
      dropdown.classList.add('show');
    } else {
      dropdown.classList.remove('show');
    }
  }

  hideSuggestions () {
    const dropdown = this.shadowRoot.querySelector('#suggestions-dropdown');
    dropdown.classList.remove('show');
  }

  selectLocation (location) {
    // Check if already selected (by display_name and coordinates)
    const isDuplicate = this.selectedLocations.some(loc =>
      loc.display_name === location.display_name &&
      loc.lat === location.lat &&
      loc.lon === location.lon
    );

    if (isDuplicate) {
      return;
    }

    this.selectedLocations.push(location);
    this.updateLocationsDisplay();
    this.shadowRoot.querySelector('#location-search-input').value = '';
    this.hideSuggestions();
    this.dispatchChangeEvent();
  }

  removeLocation (index) {
    this.selectedLocations.splice(index, 1);
    this.updateLocationsDisplay();
    this.dispatchChangeEvent();
  }

  updateLocationsDisplay () {
    const container = this.shadowRoot.querySelector('#locations-container');
    container.innerHTML = '';

    this.selectedLocations.forEach((location, index) => {
      const pill = document.createElement('div');
      pill.className = 'location-pill';
      pill.innerHTML = `
        <span class="location-name">${this.escapeHtml(location.display_name)}</span>
        <button type="button" class="remove-btn" data-index="${index}">×</button>
      `;

      pill.querySelector('.remove-btn').addEventListener('click', () => {
        this.removeLocation(index);
      });

      container.appendChild(pill);
    });
  }

  escapeHtml (text) {
    if (!text) {
      return '';
    }
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  dispatchChangeEvent () {
    this.dispatchEvent(new CustomEvent('location-selected', {
      bubbles: true,
      composed: true,
      detail: {
        locations: this.selectedLocations,
        coordinates: this.selectedLocations.length > 0
          ? [parseFloat(this.selectedLocations[0].lon), parseFloat(this.selectedLocations[0].lat)]
          : null
      }
    }));
  }

  // Public methods for getting/setting values
  getLocation () {
    if (this.selectedLocations.length === 0) {
      return null;
    }

    // Return the first location's data
    const firstLocation = this.selectedLocations[0];
    return {
      coordinates: [parseFloat(firstLocation.lon), parseFloat(firstLocation.lat)],
      locationData: firstLocation // Full Nomatim result
    };
  }

  getLocations () {
    return this.selectedLocations.map(loc => ({
      coordinates: [parseFloat(loc.lon), parseFloat(loc.lat)],
      locationData: loc
    }));
  }

  setLocation (location, boundary) {
    // For backward compatibility - if location is provided, convert to Nomatim format
    if (location && location.coordinates) {
      const [lon, lat] = location.coordinates;
      const locationData = {
        display_name: boundary?.properties?.name || `Location (${lat}, ${lon})`,
        lat: lat.toString(),
        lon: lon.toString(),
        ...location.locationData
      };
      this.selectedLocations = [locationData];
      this.updateLocationsDisplay();
    } else {
      this.selectedLocations = [];
      this.updateLocationsDisplay();
    }
  }

  clear () {
    this.selectedLocations = [];
    this.updateLocationsDisplay();
    this.shadowRoot.querySelector('#location-search-input').value = '';
    this.hideSuggestions();
  }
}

customElements.define('action-location-picker', ActionLocationPicker);
