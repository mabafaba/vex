class ActionForm extends HTMLElement {
  constructor () {
    super();
    this.action = null;
    this.groups = [];
    this.actions = [];
    this.selectedLocation = null;
    this.pictures = []; // Array of picture URLs/data URLs
    this.attachShadow({ mode: 'open' });
    this.render();
  }

  static get observedAttributes () {
    return ['action-id'];
  }

  attributeChangedCallback (name, oldValue, newValue) {
    console.log('ActionForm: attributeChangedCallback', { name, oldValue, newValue, isConnected: this.isConnected });
    if (name === 'action-id' && newValue !== oldValue && newValue) {
      // Only load if the component is connected
      if (this.isConnected) {
        // Use setTimeout to ensure DOM is ready
        setTimeout(() => {
          this.loadAction(newValue);
        }, 0);
      } else {
        console.log('ActionForm: Not connected, skipping load');
      }
    } else if (name === 'action-id' && !newValue) {
      // Clear form if action-id is removed
      this.action = null;
      this.pictures = [];
      const form = this.shadowRoot.querySelector('form');
      if (form) {
        form.reset();
      }
    }
  }

  async connectedCallback () {
    await this.loadGroups();
    await this.loadActions();
    if (this.hasAttribute('action-id')) {
      await this.loadAction(this.getAttribute('action-id'));
    }
  }

  async loadGroups () {
    // Groups are now loaded on-demand via the tag selector's search
    // This method is kept for backward compatibility but no longer needed
  }

  async loadActions () {
    // Actions are now loaded on-demand via the tag selector's search
    // This method is kept for backward compatibility but no longer needed
  }

  async loadAction (id) {
    try {
      console.log('ActionForm: Loading action', id);
      const response = await fetch(`/vex/actions/${id}`, {
        credentials: 'include'
      });
      if (response.ok) {
        this.action = await response.json();
        console.log('ActionForm: Action loaded', this.action);
        // Set exclude-id on action-tag-selector to prevent selecting self
        const partOfSelector = this.shadowRoot.querySelector('action-tag-selector');
        if (partOfSelector && id) {
          partOfSelector.setAttribute('exclude-id', id);
        }
        this.populateForm();
      } else {
        console.error('ActionForm: Failed to load action', response.status);
      }
    } catch (error) {
      console.error('Error loading action:', error);
    }
  }

  populateForm () {
    if (!this.action) {
      console.log('ActionForm: No action data to populate');
      return;
    }

    // Wait for form elements to be ready
    const nameInput = this.shadowRoot.querySelector('#name');
    const descriptionInput = this.shadowRoot.querySelector('#description');
    const dateInput = this.shadowRoot.querySelector('#date');
    const contactInput = this.shadowRoot.querySelector('#contact');

    if (!nameInput || !dateInput) {
      console.log('ActionForm: Form elements not ready, retrying...');
      // Form not ready yet, try again after a short delay
      if (!this._populateRetries) {
        this._populateRetries = 0;
      }
      if (this._populateRetries < 20) {
        this._populateRetries++;
        setTimeout(() => this.populateForm(), 100);
        return;
      } else {
        console.error('ActionForm: Failed to populate form after multiple retries');
        this._populateRetries = 0;
        return;
      }
    }

    console.log('ActionForm: Populating form with action data');
    this._populateRetries = 0;

    nameInput.value = this.action.name || '';
    if (descriptionInput) {
      descriptionInput.value = this.action.description || '';
    }
    const dateValue = this.action.date
      ? new Date(this.action.date).toISOString().slice(0, 16)
      : '';
    dateInput.value = dateValue;
    if (contactInput) {
      contactInput.value = this.action.contact || '';
    }

    // Load pictures
    if (this.action.pictures && this.action.pictures.length > 0) {
      this.pictures = this.action.pictures;
      this.renderPicturePreview();
    } else if (this.action.picture) {
      // Backward compatibility with old single picture field
      this.pictures = [this.action.picture];
      this.renderPicturePreview();
    }

    // Set places if available
    const locationPicker = this.shadowRoot.querySelector('action-location-picker');
    if (locationPicker && this.action.places && this.action.places.length > 0) {
      // Extract Nominatim data from places and set in location picker
      const locationDataArray = this.action.places
        .filter(place => place.properties && place.properties.nominatimData)
        .map(place => place.properties.nominatimData);

      if (locationDataArray.length > 0) {
        // Set selected locations in the picker
        locationPicker.selectedLocations = locationDataArray;
        locationPicker.updateLocationsDisplay();
      }
    }

    // Set organisers
    const organisersSelector = this.shadowRoot.querySelector('group-tag-selector');
    if (organisersSelector && this.action.organisers) {
      // organisers might be populated objects or just IDs
      const groups = this.action.organisers.map(org => {
        if (typeof org === 'string') {
          return { _id: org, name: 'Loading...' };
        }
        return { _id: org._id, name: org.name || 'Unknown' };
      });
      organisersSelector.setSelectedGroups(groups);
    }

    // Set partOf
    const partOfSelector = this.shadowRoot.querySelector('action-tag-selector');
    if (partOfSelector && this.action.partOf) {
      // partOf might be populated objects or just IDs
      const actions = this.action.partOf.map(act => {
        if (typeof act === 'string') {
          return { _id: act, name: 'Loading...' };
        }
        return { _id: act._id, name: act.name || 'Unknown', date: act.date };
      });
      partOfSelector.setSelectedActions(actions);
    }
  }

  // Removed updateOrganisersSelect and updatePartOfSelect - both now handled by tag selectors

  render () {
    this.shadowRoot.innerHTML = `
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.7.1/dist/leaflet.css"/>
      <style>
        :host {
          display: block;
          padding: 20px;
        }
        form {
          max-width: 800px;
          margin: 0 auto;
        }
        .form-group {
          margin-bottom: 20px;
        }
        label {
          display: block;
          margin-bottom: 5px;
          font-weight: bold;
        }
        input[type="text"],
        input[type="datetime-local"],
        textarea,
        select {
          width: 100%;
          padding: 8px;
          border: 1px solid #ddd;
          border-radius: 4px;
          box-sizing: border-box;
        }
        textarea {
          min-height: 100px;
          resize: vertical;
        }
        select[multiple] {
          min-height: 120px;
        }
        input[type="file"] {
          margin-bottom: 10px;
        }
        .picture-preview {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin-top: 10px;
        }
        .picture-preview-item {
          position: relative;
          width: 150px;
          height: 150px;
          border: 1px solid #ddd;
          border-radius: 4px;
          overflow: hidden;
        }
        .picture-preview-item img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .picture-preview-item .remove-btn {
          position: absolute;
          top: 5px;
          right: 5px;
          background: rgba(255, 0, 0, 0.7);
          color: white;
          border: none;
          border-radius: 50%;
          width: 24px;
          height: 24px;
          cursor: pointer;
          font-size: 16px;
          line-height: 1;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .picture-preview-item .remove-btn:hover {
          background: rgba(255, 0, 0, 0.9);
        }
        button {
          background: #007bff;
          color: white;
          padding: 10px 20px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 16px;
        }
        button:hover {
          background: #0056b3;
        }
        button:disabled {
          background: #ccc;
          cursor: not-allowed;
        }
      </style>
      <form>
        <div class="form-group">
          <label for="name">Name *</label>
          <input type="text" id="name" required>
        </div>
        <div class="form-group">
          <label for="description">Description</label>
          <textarea id="description"></textarea>
        </div>
        <div class="form-group">
          <label for="date">Date *</label>
          <input type="datetime-local" id="date" required>
        </div>
        <div class="form-group">
          <label for="contact">Contact</label>
          <input type="text" id="contact">
        </div>
        <div class="form-group">
          <label for="pictures">Pictures</label>
          <input type="file" id="pictures" accept="image/*" multiple>
          <input type="text" id="picture-url" placeholder="Or enter image URL">
          <div id="picture-preview" class="picture-preview"></div>
        </div>
        <div class="form-group">
          <label for="location">Location *</label>
          <action-location-picker id="location-picker"></action-location-picker>
        </div>
        <div class="form-group">
          <label for="organisers">Organisers (Groups)</label>
          <group-tag-selector id="organisers"></group-tag-selector>
        </div>
        <div class="form-group">
          <label for="partOf">Part Of (Other Actions)</label>
          <action-tag-selector id="partOf"></action-tag-selector>
        </div>
        <button type="submit">${this.hasAttribute('action-id') ? 'Update' : 'Create'} Action</button>
      </form>
    `;

    this.shadowRoot.querySelector('form').addEventListener('submit', (e) => this.handleSubmit(e));

    // Set exclude-id on action-tag-selector if editing
    if (this.hasAttribute('action-id')) {
      const partOfSelector = this.shadowRoot.querySelector('action-tag-selector');
      if (partOfSelector) {
        partOfSelector.setAttribute('exclude-id', this.getAttribute('action-id'));
      }
    }

    // Listen for location selection
    this.shadowRoot.addEventListener('location-selected', (e) => {
      this.selectedLocation = e.detail;
    });

    // Handle file uploads
    const fileInput = this.shadowRoot.querySelector('#pictures');
    if (fileInput) {
      fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
    }

    // Handle URL input
    const urlInput = this.shadowRoot.querySelector('#picture-url');
    if (urlInput) {
      urlInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          this.addPictureUrl(urlInput.value.trim());
          urlInput.value = '';
        }
      });
    }
  }

  handleFileSelect (event) {
    const files = Array.from(event.target.files);
    files.forEach(file => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          this.pictures.push(e.target.result);
          this.renderPicturePreview();
        };
        reader.readAsDataURL(file);
      }
    });
    // Reset input to allow selecting the same file again
    event.target.value = '';
  }

  addPictureUrl (url) {
    if (url) {
      this.pictures.push(url);
      this.renderPicturePreview();
    }
  }

  removePicture (index) {
    this.pictures.splice(index, 1);
    this.renderPicturePreview();
  }

  renderPicturePreview () {
    const previewContainer = this.shadowRoot.querySelector('#picture-preview');
    if (!previewContainer) {
      return;
    }

    previewContainer.innerHTML = '';

    this.pictures.forEach((picture, index) => {
      const item = document.createElement('div');
      item.className = 'picture-preview-item';
      item.innerHTML = `
        <img src="${this.escapeHtml(picture)}" alt="Preview ${index + 1}">
        <button type="button" class="remove-btn" data-index="${index}">×</button>
      `;

      item.querySelector('.remove-btn').addEventListener('click', () => {
        this.removePicture(index);
      });

      previewContainer.appendChild(item);
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

  async handleSubmit (e) {
    e.preventDefault();
    const button = this.shadowRoot.querySelector('button[type="submit"]');
    button.disabled = true;

    try {
      const locationPicker = this.shadowRoot.querySelector('action-location-picker');
      const selectedLocations = locationPicker.selectedLocations || [];

      if (selectedLocations.length === 0) {
        alert('Please select at least one location');
        button.disabled = false;
        return;
      }

      // selectedLocations is already an array of Nominatim data objects
      const locationData = selectedLocations;

      const formData = {
        name: this.shadowRoot.querySelector('#name').value,
        description: this.shadowRoot.querySelector('#description').value,
        date: this.shadowRoot.querySelector('#date').value,
        contact: this.shadowRoot.querySelector('#contact').value,
        pictures: this.pictures,
        locationData: locationData,
        organisers: this.shadowRoot.querySelector('group-tag-selector').getSelectedGroupIds(),
        partOf: this.shadowRoot.querySelector('action-tag-selector').getSelectedActionIds()
      };

      const url = this.action
        ? `/vex/actions/${this.action._id}`
        : '/vex/actions';
      const method = this.action ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData),
        credentials: 'include'
      });

      if (response.ok) {
        const savedAction = await response.json();
        this.dispatchEvent(new CustomEvent('action-saved', {
          bubbles: true,
          composed: true,
          detail: savedAction
        }));
        if (!this.action) {
          // Reset form if creating new
          this.shadowRoot.querySelector('form').reset();
        }
      } else {
        const error = await response.json();
        alert(`Error: ${error.error || 'Failed to save action'}`);
      }
    } catch (error) {
      console.error('Error saving action:', error);
      alert('Failed to save action. Please try again.');
    } finally {
      button.disabled = false;
    }
  }
}

customElements.define('action-form', ActionForm);

