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

  async connectedCallback () {
    await this.loadGroups();
    await this.loadActions();
    if (this.hasAttribute('action-id')) {
      await this.loadAction(this.getAttribute('action-id'));
    }
  }

  async loadGroups () {
    try {
      const response = await fetch('/vex/groups', {
        credentials: 'include'
      });
      if (response.ok) {
        this.groups = await response.json();
        this.updateOrganisersSelect();
      }
    } catch (error) {
      console.error('Error loading groups:', error);
    }
  }

  async loadActions () {
    try {
      const response = await fetch('/vex/actions', {
        credentials: 'include'
      });
      if (response.ok) {
        this.actions = await response.json();
        this.updatePartOfSelect();
      }
    } catch (error) {
      console.error('Error loading actions:', error);
    }
  }

  async loadAction (id) {
    try {
      const response = await fetch(`/vex/actions/${id}`, {
        credentials: 'include'
      });
      if (response.ok) {
        this.action = await response.json();
        this.populateForm();
      }
    } catch (error) {
      console.error('Error loading action:', error);
    }
  }

  populateForm () {
    if (!this.action) {
      return;
    }

    this.shadowRoot.querySelector('#name').value = this.action.name || '';
    this.shadowRoot.querySelector('#description').value = this.action.description || '';
    const dateValue = this.action.date
      ? new Date(this.action.date).toISOString().slice(0, 16)
      : '';
    this.shadowRoot.querySelector('#date').value = dateValue;
    this.shadowRoot.querySelector('#contact').value = this.action.contact || '';

    // Load pictures
    if (this.action.pictures && this.action.pictures.length > 0) {
      this.pictures = this.action.pictures;
      this.renderPicturePreview();
    } else if (this.action.picture) {
      // Backward compatibility with old single picture field
      this.pictures = [this.action.picture];
      this.renderPicturePreview();
    }

    // Set location if available
    const hasLocation = this.action.location && this.action.location.coordinates;
    const hasBoundaries = this.action.administrativeBoundaries &&
      this.action.administrativeBoundaries.length > 0;
    if (hasLocation && hasBoundaries) {
      const locationPicker = this.shadowRoot.querySelector('action-location-picker');
      const boundary = this.action.administrativeBoundaries[
        this.action.administrativeBoundaries.length - 1
      ];
      if (locationPicker) {
        locationPicker.setLocation(this.action.location, boundary);
      }
    }

    // Set organisers
    const organisersSelect = this.shadowRoot.querySelector('#organisers');
    if (this.action.organisers) {
      Array.from(organisersSelect.options).forEach(option => {
        option.selected = this.action.organisers.some(o => o._id === option.value);
      });
    }

    // Set partOf
    const partOfSelect = this.shadowRoot.querySelector('#partOf');
    if (this.action.partOf) {
      Array.from(partOfSelect.options).forEach(option => {
        option.selected = this.action.partOf.some(a => a._id === option.value);
      });
    }
  }

  updateOrganisersSelect () {
    const select = this.shadowRoot.querySelector('#organisers');
    select.innerHTML = '<option value="">Select organisers...</option>';
    this.groups.forEach(group => {
      const option = document.createElement('option');
      option.value = group._id;
      option.textContent = group.name;
      select.appendChild(option);
    });
  }

  updatePartOfSelect () {
    const select = this.shadowRoot.querySelector('#partOf');
    select.innerHTML = '<option value="">Select actions this is part of...</option>';
    // Filter out current action if editing
    const filteredActions = this.action
      ? this.actions.filter(a => a._id !== this.action._id)
      : this.actions;
    filteredActions.forEach(action => {
      const option = document.createElement('option');
      option.value = action._id;
      const dateStr = new Date(action.date).toLocaleDateString();
      option.textContent = `${action.name} (${dateStr})`;
      select.appendChild(option);
    });
  }

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
          <select id="organisers" multiple>
            <option value="">Loading...</option>
          </select>
        </div>
        <div class="form-group">
          <label for="partOf">Part Of (Other Actions)</label>
          <select id="partOf" multiple>
            <option value="">Loading...</option>
          </select>
        </div>
        <button type="submit">${this.hasAttribute('action-id') ? 'Update' : 'Create'} Action</button>
      </form>
    `;

    this.shadowRoot.querySelector('form').addEventListener('submit', (e) => this.handleSubmit(e));

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
      const locationData = locationPicker.getLocation();

      if (!locationData || !locationData.coordinates) {
        alert('Please select a location');
        button.disabled = false;
        return;
      }

      const formData = {
        name: this.shadowRoot.querySelector('#name').value,
        description: this.shadowRoot.querySelector('#description').value,
        date: this.shadowRoot.querySelector('#date').value,
        contact: this.shadowRoot.querySelector('#contact').value,
        pictures: this.pictures,
        location: {
          coordinates: locationData.coordinates
        },
        selectedBoundaryId: locationData.administrativeBoundary?._id,
        organisers: Array.from(this.shadowRoot.querySelector('#organisers').selectedOptions).map(o => o.value),
        partOf: Array.from(this.shadowRoot.querySelector('#partOf').selectedOptions).map(o => o.value)
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

