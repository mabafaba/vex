class GroupForm extends HTMLElement {
  constructor () {
    super();
    this.group = null;
    this.groups = [];
    this.selectedLocation = null;
    this.attachShadow({ mode: 'open' });
    this.render();
  }

  async connectedCallback () {
    await this.loadGroups();
    if (this.hasAttribute('group-id')) {
      await this.loadGroup(this.getAttribute('group-id'));
    }
  }

  async loadGroups () {
    try {
      const response = await fetch('/vex/groups', {
        credentials: 'include'
      });
      if (response.ok) {
        this.groups = await response.json();
        this.updatePartOfSelect();
      }
    } catch (error) {
      console.error('Error loading groups:', error);
    }
  }

  async loadGroup (id) {
    try {
      const response = await fetch(`/vex/groups/${id}`, {
        credentials: 'include'
      });
      if (response.ok) {
        this.group = await response.json();
        this.populateForm();
      }
    } catch (error) {
      console.error('Error loading group:', error);
    }
  }

  populateForm () {
    if (!this.group) return;

    this.shadowRoot.querySelector('#name').value = this.group.name || '';
    this.shadowRoot.querySelector('#description').value = this.group.description || '';
    this.shadowRoot.querySelector('#link').value = this.group.link || '';
    this.shadowRoot.querySelector('#contact').value = this.group.contact || '';

    // Set location if available
    const hasLocation = this.group.location && this.group.location.coordinates;
    const hasBoundaries = this.group.administrativeBoundaries &&
      this.group.administrativeBoundaries.length > 0;
    if (hasLocation && hasBoundaries) {
      const locationPicker = this.shadowRoot.querySelector('action-location-picker');
      const boundary = this.group.administrativeBoundaries[
        this.group.administrativeBoundaries.length - 1
      ];
      if (locationPicker) {
        locationPicker.setLocation(this.group.location, boundary);
      }
    }

    // Set partOf
    const partOfSelect = this.shadowRoot.querySelector('#partOf');
    if (this.group.partOf) {
      Array.from(partOfSelect.options).forEach(option => {
        option.selected = this.group.partOf.some(g => g._id === option.value);
      });
    }
  }

  updatePartOfSelect () {
    const select = this.shadowRoot.querySelector('#partOf');
    select.innerHTML = '<option value="">Select groups this is part of...</option>';
    // Filter out current group if editing
    const filteredGroups = this.group
      ? this.groups.filter(g => g._id !== this.group._id)
      : this.groups;
    filteredGroups.forEach(group => {
      const option = document.createElement('option');
      option.value = group._id;
      option.textContent = group.name;
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
        .optional {
          font-weight: normal;
          color: #666;
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
          <label for="link">Link</label>
          <input type="text" id="link">
        </div>
        <div class="form-group">
          <label for="contact">Contact</label>
          <input type="text" id="contact">
        </div>
        <div class="form-group">
          <label for="location">Location <span class="optional">(optional)</span></label>
          <action-location-picker id="location-picker"></action-location-picker>
        </div>
        <div class="form-group">
          <label for="partOf">Part Of (Other Groups)</label>
          <select id="partOf" multiple>
            <option value="">Loading...</option>
          </select>
        </div>
        <button type="submit">${this.hasAttribute('group-id') ? 'Update' : 'Create'} Group</button>
      </form>
    `;

    this.shadowRoot.querySelector('form').addEventListener('submit', (e) => this.handleSubmit(e));
    
    // Listen for location selection
    this.shadowRoot.addEventListener('location-selected', (e) => {
      this.selectedLocation = e.detail;
    });
  }

  async handleSubmit (e) {
    e.preventDefault();
    const button = this.shadowRoot.querySelector('button[type="submit"]');
    button.disabled = true;

    try {
      const locationPicker = this.shadowRoot.querySelector('action-location-picker');
      let location = null;
      
      const locationData = locationPicker.getLocation();
      if (locationData && locationData.coordinates) {
        location = {
          coordinates: locationData.coordinates
        };
      } else if (this.group && this.group.location) {
        // Keep existing location if not changed
        location = {
          coordinates: this.group.location.coordinates
        };
      }

      const formData = {
        name: this.shadowRoot.querySelector('#name').value,
        description: this.shadowRoot.querySelector('#description').value,
        link: this.shadowRoot.querySelector('#link').value,
        contact: this.shadowRoot.querySelector('#contact').value,
        partOf: Array.from(this.shadowRoot.querySelector('#partOf').selectedOptions).map(o => o.value)
      };

      if (location) {
        formData.location = location;
        const locationData = locationPicker.getLocation();
        if (locationData && locationData.administrativeBoundary) {
          formData.selectedBoundaryId = locationData.administrativeBoundary._id;
        }
      }

      const url = this.group
        ? `/vex/groups/${this.group._id}`
        : '/vex/groups';
      const method = this.group ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData),
        credentials: 'include'
      });

      if (response.ok) {
        const savedGroup = await response.json();
        this.dispatchEvent(new CustomEvent('group-saved', {
          bubbles: true,
          composed: true,
          detail: savedGroup
        }));
        if (!this.group) {
          // Reset form if creating new
          this.shadowRoot.querySelector('form').reset();
        }
      } else {
        const error = await response.json();
        alert(`Error: ${error.error || 'Failed to save group'}`);
      }
    } catch (error) {
      console.error('Error saving group:', error);
      alert('Failed to save group. Please try again.');
    } finally {
      button.disabled = false;
    }
  }
}

customElements.define('group-form', GroupForm);

