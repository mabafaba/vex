console.log('LeafletLocationPicker loaded');
class LeafletLocationPicker extends HTMLElement {
  static get observedAttributes () {
    return ['mapwidth', 'mapheight', 'zoom', 'lat', 'lon'];
  }

  constructor () {
    super();
    console.log('LeafletLocationPicker constructor');
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.innerHTML = `
            <style>
                #locationpickermap {
                    width: ${this.getAttribute('mapwidth') || '100%'};
                    height: ${this.getAttribute('mapheight') || '400px'};
                }
            </style>
            <div id="locationpickermap"></div>
            <link rel="stylesheet" href="https://unpkg.com/leaflet@1.7.1/dist/leaflet.css"/>
            <script src="https://unpkg.com/leaflet@1.7.1/dist/leaflet.js"></script>
        `;
    console.log('LeafletLocationPicker created');

    const lat = parseFloat(this.getAttribute('lat')) || 51.505;
    const lon = parseFloat(this.getAttribute('lon')) || -0.09;
    const zoom = parseInt(this.getAttribute('zoom')) || 13;

    // Wait for the Leaflet script to load
    console.log('starting map');
    this.map = L.map(this.shadowRoot.getElementById('locationpickermap')).setView([lat, lon], zoom);
    console.log('map created', this.map);
    this.initializeMap();
  }

  attributeChangedCallback (name, oldValue, newValue) {
    if (name === 'mapwidth' || name === 'mapheight') {
      this.shadowRoot.querySelector('#locationpickermap').style[name] = newValue;
    }
  }

  connectedCallback () {
    // Map initialization is done in the constructor after the script loads
  }

  initializeMap () {
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(this.map);

    this.map.on('click', this.onMapClick.bind(this));
  }

  onMapClick (event) {
    if (this.marker) {
      this.map.removeLayer(this.marker);
    }
    this.marker = L.marker(event.latlng).addTo(this.map);
    this.pickedLocation = event.latlng;
    // emit event
    this.dispatchEvent(new CustomEvent('leaflet-location-picker-locationpicked', { detail: event.latlng }));
  }

  location () {
    return new Promise((resolve, reject) => {
      if (this.pickedLocation) {
        resolve(this.pickedLocation);
      } else {
        alert('First click on the map to select a location');
        reject('No location picked');
      }
    });
  }
}

customElements.define('leaflet-location-picker', LeafletLocationPicker);
