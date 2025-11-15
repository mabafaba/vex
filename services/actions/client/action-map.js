class ActionMap extends HTMLElement {
  constructor () {
    super();
    this.actions = [];
    this.groups = [];
    this.map = null;
    this.markers = [];
    this.boundaryLayers = [];
    this.attachShadow({ mode: 'open' });
    this.render();
  }

  async connectedCallback () {
    await this.loadData();
    this.initializeMap();
    this.setupVisibilityObserver();
  }

  setupVisibilityObserver () {
    // Use IntersectionObserver to detect when the map becomes visible
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && this.map) {
          // Map became visible, resize it
          this.resizeMap();
        }
      });
    }, {
      threshold: 0.1
    });

    // Observe the host element
    observer.observe(this);
    this.visibilityObserver = observer;
  }

  resizeMap () {
    if (this.map) {
      // Use requestAnimationFrame to ensure DOM has updated
      requestAnimationFrame(() => {
        // eslint-disable-next-line no-undef
        this.map.invalidateSize();
      });
    }
  }

  async loadData () {
    try {
      const [actionsRes, groupsRes] = await Promise.all([
        fetch('/vex/actions', { credentials: 'include' }),
        fetch('/vex/groups', { credentials: 'include' })
      ]);

      if (actionsRes.ok) {
        this.actions = await actionsRes.json();
      }
      if (groupsRes.ok) {
        this.groups = await groupsRes.json();
      }
    } catch (error) {
      console.error('Error loading data:', error);
    }
  }

  render () {
    this.shadowRoot.innerHTML = `
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.7.1/dist/leaflet.css"/>
      <style>
        :host {
          display: block;
          padding: 20px;
        }
        #action-map {
          width: 100%;
          height: 600px;
          border: 1px solid #ddd;
          border-radius: 8px;
        }
        .map-controls {
          margin-bottom: 10px;
          display: flex;
          gap: 10px;
        }
        .map-controls button {
          padding: 8px 16px;
          border: 1px solid #ddd;
          border-radius: 4px;
          background: white;
          cursor: pointer;
        }
        .map-controls button.active {
          background: #007bff;
          color: white;
        }
      </style>
      <div class="map-controls">
        <button id="show-actions" class="active">Show Actions</button>
        <button id="show-groups">Show Groups</button>
        <button id="show-both" class="active">Show Both</button>
      </div>
      <div id="action-map"></div>
    `;

    this.shadowRoot.querySelector('#show-actions').addEventListener('click', () => {
      this.toggleFilter('actions');
    });
    this.shadowRoot.querySelector('#show-groups').addEventListener('click', () => {
      this.toggleFilter('groups');
    });
    this.shadowRoot.querySelector('#show-both').addEventListener('click', () => {
      this.toggleFilter('both');
    });
  }

  toggleFilter (filter) {
    const buttons = this.shadowRoot.querySelectorAll('.map-controls button');
    buttons.forEach(btn => btn.classList.remove('active'));

    if (filter === 'actions') {
      this.shadowRoot.querySelector('#show-actions').classList.add('active');
      this.shadowRoot.querySelector('#show-groups').classList.remove('active');
      this.shadowRoot.querySelector('#show-both').classList.remove('active');
    } else if (filter === 'groups') {
      this.shadowRoot.querySelector('#show-actions').classList.remove('active');
      this.shadowRoot.querySelector('#show-groups').classList.add('active');
      this.shadowRoot.querySelector('#show-both').classList.remove('active');
    } else {
      this.shadowRoot.querySelector('#show-actions').classList.add('active');
      this.shadowRoot.querySelector('#show-groups').classList.add('active');
      this.shadowRoot.querySelector('#show-both').classList.add('active');
    }

    this.updateMarkers(filter);
  }

  initializeMap () {
    // Wait for Leaflet to be available
    if (typeof L === 'undefined') {
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/leaflet@1.7.1/dist/leaflet.js';
      script.onload = () => this.createMap();
      document.head.appendChild(script);
    } else {
      this.createMap();
    }
  }

  createMap () {
    const mapContainer = this.shadowRoot.getElementById('action-map');
    // eslint-disable-next-line no-undef
    this.map = L.map(mapContainer).setView([51.505, -0.09], 2);

    // eslint-disable-next-line no-undef
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(this.map);

    this.updateMarkers('both');
  }

  async updateMarkers (filter) {
    // Clear existing markers and boundary layers
    this.markers.forEach(marker => {
      this.map.removeLayer(marker);
    });
    this.markers = [];

    this.boundaryLayers.forEach(layer => {
      this.map.removeLayer(layer);
    });
    this.boundaryLayers = [];

    const showActions = filter === 'actions' || filter === 'both';
    const showGroups = filter === 'groups' || filter === 'both';

    const bounds = [];

    // Add action boundaries and markers
    if (showActions) {
      for (const action of this.actions) {
        const boundaryData = await this.getBoundaryData(action);
        if (boundaryData) {
          // Add boundary polygon
          const boundaryLayer = this.addBoundaryLayer(boundaryData, '#007bff', action, 'action');
          if (boundaryLayer) {
            bounds.push(boundaryLayer);
          }

          // Add marker at centroid
          const position = await this.getPosition(action);
          if (position) {
            // eslint-disable-next-line no-undef
            const marker = L.marker([position.lat, position.lng], {
              // eslint-disable-next-line no-undef
              icon: L.divIcon({
                className: 'action-marker',
                html: '<div style="background: #007bff; width: 20px; height: 20px; ' +
                  'border-radius: 50%; border: 2px solid white;"></div>',
                iconSize: [20, 20]
              })
            }).addTo(this.map);

            const organisers = action.organisers && action.organisers.length > 0
              ? action.organisers.map(o => o.name || o).join(', ')
              : 'No organisers';

            const date = new Date(action.date);
            const locationName = this.getLocationName(action);
            const pictures = this.renderPictures(action);
            marker.bindPopup(`
              <strong>${this.escapeHtml(action.name)}</strong><br>
              ${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}<br>
              ${locationName ? `<small>📍 ${this.escapeHtml(locationName)}</small><br>` : ''}
              ${pictures}
              ${action.description ? `<p>${this.escapeHtml(action.description)}</p>` : ''}
              <small>Organisers: ${this.escapeHtml(organisers)}</small>
            `);

            this.markers.push(marker);
          }
        } else {
          // Fallback: just add marker if no boundary
          const position = await this.getPosition(action);
          if (position) {
            // eslint-disable-next-line no-undef
            const marker = L.marker([position.lat, position.lng], {
              // eslint-disable-next-line no-undef
              icon: L.divIcon({
                className: 'action-marker',
                html: '<div style="background: #007bff; width: 20px; height: 20px; ' +
                  'border-radius: 50%; border: 2px solid white;"></div>',
                iconSize: [20, 20]
              })
            }).addTo(this.map);

            const organisers = action.organisers && action.organisers.length > 0
              ? action.organisers.map(o => o.name || o).join(', ')
              : 'No organisers';

            const date = new Date(action.date);
            const pictures = this.renderPictures(action);
            marker.bindPopup(`
              <strong>${this.escapeHtml(action.name)}</strong><br>
              ${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}<br>
              ${pictures}
              ${action.description ? `<p>${this.escapeHtml(action.description)}</p>` : ''}
              <small>Organisers: ${this.escapeHtml(organisers)}</small>
            `);

            this.markers.push(marker);
            bounds.push(marker);
          }
        }
      }
    }

    // Add group boundaries and markers
    if (showGroups) {
      for (const group of this.groups) {
        const boundaryData = await this.getBoundaryData(group);
        if (boundaryData) {
          // Add boundary polygon
          const boundaryLayer = this.addBoundaryLayer(boundaryData, '#28a745', group, 'group');
          if (boundaryLayer) {
            bounds.push(boundaryLayer);
          }

          // Add marker at centroid
          const position = await this.getPosition(group);
          if (position) {
            // eslint-disable-next-line no-undef
            const marker = L.marker([position.lat, position.lng], {
              // eslint-disable-next-line no-undef
              icon: L.divIcon({
                className: 'group-marker',
                html: '<div style="background: #28a745; width: 20px; height: 20px; ' +
                  'border-radius: 50%; border: 2px solid white;"></div>',
                iconSize: [20, 20]
              })
            }).addTo(this.map);

            const locationName = this.getLocationName(group);
            marker.bindPopup(`
              <strong>${this.escapeHtml(group.name)}</strong><br>
              ${locationName ? `<small>📍 ${this.escapeHtml(locationName)}</small><br>` : ''}
              ${group.description ? `<p>${this.escapeHtml(group.description)}</p>` : ''}
              ${group.link ? `<a href="${this.escapeHtml(group.link)}" target="_blank">Visit</a>` : ''}
            `);

            this.markers.push(marker);
          }
        } else {
          // Fallback: just add marker if no boundary
          const position = await this.getPosition(group);
          if (position) {
            // eslint-disable-next-line no-undef
            const marker = L.marker([position.lat, position.lng], {
              // eslint-disable-next-line no-undef
              icon: L.divIcon({
                className: 'group-marker',
                html: '<div style="background: #28a745; width: 20px; height: 20px; ' +
                  'border-radius: 50%; border: 2px solid white;"></div>',
                iconSize: [20, 20]
              })
            }).addTo(this.map);

            const locationName = this.getLocationName(group);
            marker.bindPopup(`
              <strong>${this.escapeHtml(group.name)}</strong><br>
              ${locationName ? `<small>📍 ${this.escapeHtml(locationName)}</small><br>` : ''}
              ${group.description ? `<p>${this.escapeHtml(group.description)}</p>` : ''}
              ${group.link ? `<a href="${this.escapeHtml(group.link)}" target="_blank">Visit</a>` : ''}
            `);

            this.markers.push(marker);
            bounds.push(marker);
          }
        }
      }
    }

    // Fit map to show all boundaries and markers
    if (bounds.length > 0) {
      // eslint-disable-next-line no-undef
      const group = new L.featureGroup(bounds);
      this.map.fitBounds(group.getBounds().pad(0.1));
    }
  }

  async getBoundaryData (item) {
    if (item.administrativeBoundaries && item.administrativeBoundaries.length > 0) {
      const WORLDWIDE_BOUNDARY_ID = '68b82e48308a57671dadafb0';

      // Check boundaries from most specific (last) to least specific (first)
      // Skip worldwide boundary
      for (let i = item.administrativeBoundaries.length - 1; i >= 0; i--) {
        const boundary = item.administrativeBoundaries[i];

        // Extract boundary ID
        let boundaryId = null;
        if (typeof boundary === 'string') {
          boundaryId = boundary;
        } else if (boundary && boundary._id) {
          boundaryId = typeof boundary._id === 'string' ? boundary._id : boundary._id.toString();
        } else if (boundary && boundary.$oid) {
          boundaryId = boundary.$oid;
        } else if (boundary && typeof boundary === 'object') {
          boundaryId = boundary.toString();
        }

        // Skip worldwide boundary
        if (boundaryId === WORLDWIDE_BOUNDARY_ID) {
          continue;
        }

        if (boundaryId) {
          try {
            const response = await fetch(`/vex/administrative/${boundaryId}/geometry`, {
              credentials: 'include'
            });
            if (response.ok) {
              return await response.json();
            }
          } catch (error) {
            console.error('Error fetching boundary geometry:', error);
          }
        }
      }
    }
    return null;
  }

  addBoundaryLayer (boundaryData, color, item, type) {
    if (!boundaryData || !boundaryData.geometry) {
      return null;
    }

    // Create GeoJSON feature
    const feature = {
      type: 'Feature',
      properties: {
        name: boundaryData.properties?.name || item.name,
        type: type
      },
      geometry: boundaryData.geometry
    };

    // Create popup content based on type
    let popupContent = '';
    if (type === 'action') {
      const organisers = item.organisers && item.organisers.length > 0
        ? item.organisers.map(o => o.name || o).join(', ')
        : 'No organisers';
      const date = new Date(item.date);
      const locationName = this.getLocationName(item);
      popupContent = `
        <strong>${this.escapeHtml(item.name)}</strong><br>
        ${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}<br>
        ${locationName ? `<small>📍 ${this.escapeHtml(locationName)}</small><br>` : ''}
        ${this.renderPictures(item)}
        ${item.description ? `<p>${this.escapeHtml(item.description)}</p>` : ''}
        <small>Organisers: ${this.escapeHtml(organisers)}</small>
      `;
    } else {
      // Group
      const locationName = this.getLocationName(item);
      popupContent = `
        <strong>${this.escapeHtml(item.name)}</strong><br>
        ${locationName ? `<small>📍 ${this.escapeHtml(locationName)}</small><br>` : ''}
        ${item.description ? `<p>${this.escapeHtml(item.description)}</p>` : ''}
        ${item.link ? `<a href="${this.escapeHtml(item.link)}" target="_blank">Visit</a>` : ''}
        ${item.contact ? `<br><small>Contact: ${this.escapeHtml(item.contact)}</small>` : ''}
      `;
    }

    // eslint-disable-next-line no-undef
    const layer = L.geoJSON(feature, {
      style: {
        fillColor: color,
        fillOpacity: 0.3,
        color: color,
        weight: 2,
        opacity: 0.8
      },
      onEachFeature: (feature, layer) => {
        layer.bindPopup(popupContent);
      }
    }).addTo(this.map);

    this.boundaryLayers.push(layer);
    return layer;
  }

  async getPosition (item) {
    // First try to get position from administrative boundaries
    if (item.administrativeBoundaries && item.administrativeBoundaries.length > 0) {
      // Get the most specific boundary (usually the last one)
      const boundary = item.administrativeBoundaries[item.administrativeBoundaries.length - 1];

      // Extract boundary ID - handle different formats:
      // - Populated: {_id: "...", properties: {...}}
      // - Unpopulated string: "68b8335c46b050e64437a3fb"
      // - Unpopulated object: {"$oid": "68b8335c46b050e64437a3fb"}
      let boundaryId = null;
      if (typeof boundary === 'string') {
        boundaryId = boundary;
      } else if (boundary && boundary._id) {
        boundaryId = typeof boundary._id === 'string' ? boundary._id : boundary._id.toString();
      } else if (boundary && boundary.$oid) {
        boundaryId = boundary.$oid;
      } else if (boundary && typeof boundary === 'object') {
        // Try to get the ID from the object itself
        boundaryId = boundary.toString();
      }

      if (boundaryId) {
        try {
          // Fetch the boundary geometry
          const response = await fetch(`/vex/administrative/${boundaryId}/geometry`, {
            credentials: 'include'
          });
          if (response.ok) {
            const boundaryData = await response.json();
            if (boundaryData.geometry && boundaryData.geometry.coordinates) {
              // Calculate centroid of the MultiPolygon
              const centroid = this.calculateCentroid(boundaryData.geometry);
              return { lat: centroid[1], lng: centroid[0] };
            }
          }
        } catch (error) {
          console.error('Error fetching boundary geometry:', error);
        }
      }
    }

    // Fallback to location coordinates if available
    if (item.location && item.location.coordinates) {
      const [lng, lat] = item.location.coordinates;
      return { lat, lng };
    }

    return null;
  }

  calculateCentroid (geometry) {
    // Simple centroid calculation for MultiPolygon
    // This is a basic implementation - for production, consider using a library like Turf.js
    if (geometry.type === 'MultiPolygon' && geometry.coordinates) {
      let totalLat = 0;
      let totalLng = 0;
      let count = 0;

      geometry.coordinates.forEach(polygon => {
        polygon.forEach(ring => {
          ring.forEach(coord => {
            totalLng += coord[0];
            totalLat += coord[1];
            count++;
          });
        });
      });

      if (count > 0) {
        return [totalLng / count, totalLat / count];
      }
    }
    return [0, 0];
  }

  getLocationName (item) {
    if (item.administrativeBoundaries && item.administrativeBoundaries.length > 0) {
      const boundary = item.administrativeBoundaries[item.administrativeBoundaries.length - 1];
      // Check if boundary is populated (has properties)
      if (boundary && boundary.properties && boundary.properties.name) {
        return boundary.properties.name;
      }
      // If not populated, we could fetch it, but for now return null
      // The name will be missing but the marker will still show
    }
    return null;
  }

  renderPictures (action) {
    const pictures = action.pictures || (action.picture ? [action.picture] : []);
    if (pictures.length === 0) {
      return '';
    }
    return pictures.map(picture => {
      const escapedUrl = this.escapeHtml(picture);
      const escapedName = this.escapeHtml(action.name);
      return '<img src="' + escapedUrl + '" alt="' + escapedName + '" ' +
        'style="max-width: 200px; max-height: 150px; margin: 5px 0;"><br>';
    }).join('');
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

customElements.define('action-map', ActionMap);

