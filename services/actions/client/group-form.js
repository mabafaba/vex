class GroupForm extends HTMLElement {
  constructor () {
    super();
    this.group = null;
    this.groups = [];
    this.selectedLocation = null;
    this.attachShadow({ mode: 'open' });
    this.render();
  }

  static get observedAttributes () {
    return ['group-id'];
  }

  attributeChangedCallback (name, oldValue, newValue) {
    if (name === 'group-id' && newValue !== oldValue && newValue) {
      // Only load if the component is connected
      if (this.isConnected) {
        // Use setTimeout to ensure DOM is ready
        setTimeout(() => {
          this.loadGroup(newValue);
        }, 0);
      }
    } else if (name === 'group-id' && !newValue) {
      // Clear form if group-id is removed
      this.group = null;
      const form = this.shadowRoot.querySelector('form');
      if (form) {
        form.reset();
      }
    }
  }

  async connectedCallback () {
    await this.loadGroups();
    if (this.hasAttribute('group-id')) {
      await this.loadGroup(this.getAttribute('group-id'));
    }
  }

  async loadGroups () {
    // Groups are now loaded on-demand via the tag selector's search
    // This method is kept for backward compatibility but no longer needed
  }

  async loadGroup (id) {
    try {
      const response = await fetch(`/vex/groups/${id}`, {
        credentials: 'include'
      });
      if (response.ok) {
        this.group = await response.json();
        // Set exclude-id on group-tag-selector to prevent selecting self
        const partOfSelector = this.shadowRoot.querySelector('group-tag-selector');
        if (partOfSelector && id) {
          partOfSelector.setAttribute('exclude-id', id);
        }
        this.populateForm();
      }
    } catch (error) {
      console.error('Error loading group:', error);
    }
  }

  populateForm () {
    if (!this.group) return;

    // Wait for form elements to be ready
    const nameInput = this.shadowRoot.querySelector('#name');
    const descriptionInput = this.shadowRoot.querySelector('#description');
    const linkInput = this.shadowRoot.querySelector('#link');
    const contactInput = this.shadowRoot.querySelector('#contact');

    if (!nameInput) {
      // Form not ready yet, try again after a short delay
      setTimeout(() => this.populateForm(), 100);
      return;
    }

    nameInput.value = this.group.name || '';
    if (descriptionInput) {
      descriptionInput.value = this.group.description || '';
    }
    if (linkInput) {
      linkInput.value = this.group.link || '';
    }
    if (contactInput) {
      contactInput.value = this.group.contact || '';
    }

    // Set places if available
    const locationPicker = this.shadowRoot.querySelector('action-location-picker');
    if (locationPicker && this.group.places && this.group.places.length > 0) {
      // Extract Nominatim data from places and set in location picker
      const locationDataArray = this.group.places
        .filter(place => place.properties && place.properties.nominatimData)
        .map(place => place.properties.nominatimData);
      
      if (locationDataArray.length > 0) {
        // Set selected locations in the picker
        locationPicker.selectedLocations = locationDataArray;
        locationPicker.updateLocationsDisplay();
      }
    }

    // Set partOf
    const partOfSelector = this.shadowRoot.querySelector('group-tag-selector');
    if (partOfSelector && this.group.partOf) {
      // partOf might be populated objects or just IDs
      const groups = this.group.partOf.map(grp => {
        if (typeof grp === 'string') {
          return { _id: grp, name: 'Loading...' };
        }
        return { _id: grp._id, name: grp.name || 'Unknown' };
      });
      partOfSelector.setSelectedGroups(groups);
    }
  }

  // Removed updatePartOfSelect - groups are now handled by tag selector

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
          <group-tag-selector id="partOf"></group-tag-selector>
        </div>
        <button type="submit">${this.hasAttribute('group-id') ? 'Update' : 'Create'} Group</button>
      </form>
    `;

    this.shadowRoot.querySelector('form').addEventListener('submit', (e) => this.handleSubmit(e));

    // Set exclude-id on group-tag-selector if editing
    if (this.hasAttribute('group-id')) {
      const partOfSelector = this.shadowRoot.querySelector('group-tag-selector');
      if (partOfSelector) {
        partOfSelector.setAttribute('exclude-id', this.getAttribute('group-id'));
      }
    }

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
      const selectedLocations = locationPicker.selectedLocations || [];

      const formData = {
        name: this.shadowRoot.querySelector('#name').value,
        description: this.shadowRoot.querySelector('#description').value,
        link: this.shadowRoot.querySelector('#link').value,
        contact: this.shadowRoot.querySelector('#contact').value,
        partOf: this.shadowRoot.querySelector('group-tag-selector').getSelectedGroupIds()
      };

      // Add locationData if locations are selected
      if (selectedLocations.length > 0) {
        formData.locationData = selectedLocations;
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

