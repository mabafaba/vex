/**
 * Abstract base class for tag selectors
 * Subclasses must implement:
 * - getSearchEndpoint() - returns the search API endpoint
 * - getPlaceholder() - returns placeholder text
 * - formatSuggestionText(item) - formats how each suggestion is displayed
 * - getChangeEventName() - returns the custom event name for changes
 * - getSelectedPropertyName() - returns the property name for selected items (e.g., 'selectedGroups', 'selectedActions')
 */
class TagSelectorBase extends HTMLElement {
  constructor () {
    super();
    this.selectedItems = []; // Array of { _id, name, ... } objects
    this.suggestions = [];
    this.searchTimeout = null;
    this.attachShadow({ mode: 'open' });
    this.render();
  }

  // Abstract methods - must be implemented by subclasses
  getSearchEndpoint () {
    throw new Error('getSearchEndpoint() must be implemented by subclass');
  }

  getPlaceholder () {
    throw new Error('getPlaceholder() must be implemented by subclass');
  }

  formatSuggestionText (item) {
    return item.name || 'Unknown';
  }

  getChangeEventName () {
    throw new Error('getChangeEventName() must be implemented by subclass');
  }

  getSelectedPropertyName () {
    throw new Error('getSelectedPropertyName() must be implemented by subclass');
  }

  // Optional: override to add extra query params to search
  getSearchQueryParams (query) {
    return { q: query };
  }

  connectedCallback () {
    // Click outside to close suggestions
    this.clickOutsideHandler = (e) => {
      if (!this.shadowRoot.contains(e.target)) {
        this.hideSuggestions();
      }
    };
    document.addEventListener('click', this.clickOutsideHandler);
  }

  disconnectedCallback () {
    if (this.clickOutsideHandler) {
      document.removeEventListener('click', this.clickOutsideHandler);
    }
  }

  render () {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          width: 100%;
        }
        .tag-selector-container {
          border: 1px solid #ddd;
          border-radius: 4px;
          padding: 8px;
          min-height: 40px;
          background: white;
          position: relative;
        }
        .tags-container {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-bottom: 6px;
        }
        .tag-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: #007bff;
          color: white;
          padding: 4px 8px;
          border-radius: 16px;
          font-size: 14px;
        }
        .tag-pill .tag-name {
          max-width: 200px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .tag-pill .remove-btn {
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
        .tag-pill .remove-btn:hover {
          background: rgba(255, 255, 255, 0.5);
        }
        .search-input-container {
          position: relative;
        }
        #search-input {
          width: 100%;
          border: none;
          outline: none;
          padding: 4px 0;
          font-size: 14px;
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
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .suggestion-item:hover {
          background: #f5f5f5;
        }
        .suggestion-item:last-child {
          border-bottom: none;
        }
        .suggestion-item.disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .suggestion-item.highlighted {
          background: #007bff;
          color: white;
        }
        .suggestion-item.highlighted:hover {
          background: #0056b3;
        }
        .suggestion-content {
          flex: 1;
        }
        .suggestion-actions {
          display: flex;
          gap: 4px;
          margin-left: 8px;
        }
        .edit-btn {
          background: #28a745;
          color: white;
          border: none;
          border-radius: 4px;
          padding: 4px 8px;
          cursor: pointer;
          font-size: 12px;
          display: flex;
          align-items: center;
          gap: 4px;
          opacity: 0;
          transition: opacity 0.2s;
        }
        .suggestion-item:hover .edit-btn {
          opacity: 1;
        }
        .suggestion-item.highlighted .edit-btn {
          opacity: 1;
        }
        .edit-btn:hover {
          background: #218838;
        }
        .edit-btn:active {
          background: #1e7e34;
        }
        .no-suggestions {
          padding: 8px 12px;
          color: #666;
          font-style: italic;
        }
      </style>
      <div class="tag-selector-container">
        <div class="tags-container" id="tags-container"></div>
        <div class="search-input-container">
          <input 
            type="text" 
            id="search-input" 
            placeholder="${this.getPlaceholder()}"
            autocomplete="off"
          />
          <div class="suggestions-dropdown" id="suggestions-dropdown"></div>
        </div>
      </div>
    `;

    this.setupEventListeners();
    this.updateTagsDisplay();
  }

  setupEventListeners () {
    const input = this.shadowRoot.querySelector('#search-input');

    input.addEventListener('input', (e) => {
      const query = e.target.value.trim();
      if (query.length > 0) {
        this.debounceSearch(query);
      } else {
        this.suggestions = [];
        this.hideSuggestions();
      }
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (input.value.trim().length > 0 && this.suggestions.length > 0) {
          this.showSuggestions();
        }
        this.navigateSuggestions(1);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (input.value.trim().length > 0 && this.suggestions.length > 0) {
          this.showSuggestions();
        }
        this.navigateSuggestions(-1);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        this.selectHighlightedSuggestion();
      } else if (e.key === 'Escape') {
        this.hideSuggestions();
      } else if (e.key === 'Backspace' && input.value === '' && this.selectedItems.length > 0) {
        // Remove last tag if backspace on empty input
        this.removeItem(this.selectedItems.length - 1);
      }
    });
  }

  debounceSearch (query) {
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }
    this.searchTimeout = setTimeout(() => {
      this.performSearch(query);
    }, 300);
  }

  async performSearch (query) {
    try {
      const endpoint = this.getSearchEndpoint();
      const params = this.getSearchQueryParams(query);
      const queryString = new URLSearchParams(params).toString();
      const url = `${endpoint}?${queryString}`;

      const response = await fetch(url, {
        credentials: 'include'
      });
      if (response.ok) {
        this.suggestions = await response.json();
        this.renderSuggestions();
        // Only show if input still has text (user might have cleared it while searching)
        const input = this.shadowRoot.querySelector('#search-input');
        if (input.value.trim().length > 0) {
          this.showSuggestions();
        }
      }
    } catch (error) {
      console.error('Error searching:', error);
    }
  }

  renderSuggestions () {
    const dropdown = this.shadowRoot.querySelector('#suggestions-dropdown');
    dropdown.innerHTML = '';

    if (this.suggestions.length === 0) {
      const noResults = document.createElement('div');
      noResults.className = 'no-suggestions';
      noResults.textContent = 'No results found';
      dropdown.appendChild(noResults);
      return;
    }

    this.suggestions.forEach((item, index) => {
      const isSelected = this.selectedItems.some(i => i._id === item._id);
      const itemElement = document.createElement('div');
      itemElement.className = `suggestion-item ${isSelected ? 'disabled' : ''}`;
      itemElement.dataset.index = index;

      // Create content wrapper
      const content = document.createElement('div');
      content.className = 'suggestion-content';
      content.textContent = this.formatSuggestionText(item);
      itemElement.appendChild(content);

      // Create actions wrapper
      const actions = document.createElement('div');
      actions.className = 'suggestion-actions';

      // Add edit button
      const editBtn = document.createElement('button');
      editBtn.className = 'edit-btn';
      editBtn.type = 'button';
      editBtn.innerHTML = '✏️ Edit';
      editBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.handleEditClick(item);
      });
      actions.appendChild(editBtn);

      itemElement.appendChild(actions);

      if (!isSelected) {
        itemElement.addEventListener('click', (e) => {
          // Don't select if clicking on edit button
          if (!e.target.closest('.edit-btn')) {
            this.selectItem(item);
          }
        });
      }

      dropdown.appendChild(itemElement);
    });
  }

  // Override this method in subclasses to handle edit clicks
  handleEditClick (item) {
    // Emit a generic edit event that subclasses can customize
    this.dispatchEvent(new CustomEvent('edit-item', {
      bubbles: true,
      composed: true,
      detail: { item }
    }));
  }

  showSuggestions () {
    const dropdown = this.shadowRoot.querySelector('#suggestions-dropdown');
    const input = this.shadowRoot.querySelector('#search-input');
    const hasText = input.value.trim().length > 0;

    // Only show if there's text in the input
    if (hasText) {
      dropdown.classList.add('show');
    } else {
      dropdown.classList.remove('show');
    }
  }

  hideSuggestions () {
    const dropdown = this.shadowRoot.querySelector('#suggestions-dropdown');
    dropdown.classList.remove('show');
  }

  navigateSuggestions (direction) {
    const items = this.shadowRoot.querySelectorAll('.suggestion-item:not(.disabled)');
    if (items.length === 0) {
      return;
    }

    const currentHighlighted = this.shadowRoot.querySelector('.suggestion-item.highlighted');
    let currentIndex = -1;

    if (currentHighlighted) {
      currentIndex = Array.from(items).indexOf(currentHighlighted);
      currentHighlighted.classList.remove('highlighted');
    }

    let newIndex = currentIndex + direction;
    if (newIndex < 0) {
      newIndex = items.length - 1;
    }
    if (newIndex >= items.length) {
      newIndex = 0;
    }

    items[newIndex].classList.add('highlighted');
    items[newIndex].scrollIntoView({ block: 'nearest' });
  }

  selectHighlightedSuggestion () {
    const highlighted = this.shadowRoot.querySelector('.suggestion-item.highlighted:not(.disabled)');
    if (highlighted) {
      const index = parseInt(highlighted.dataset.index);
      if (this.suggestions[index]) {
        this.selectItem(this.suggestions[index]);
      }
    }
  }

  selectItem (item) {
    // Check if already selected
    if (this.selectedItems.some(i => i._id === item._id)) {
      return;
    }

    this.selectedItems.push(item);
    this.updateTagsDisplay();
    this.shadowRoot.querySelector('#search-input').value = '';
    this.hideSuggestions();
    this.dispatchChangeEvent();
  }

  removeItem (index) {
    this.selectedItems.splice(index, 1);
    this.updateTagsDisplay();
    this.dispatchChangeEvent();
  }

  updateTagsDisplay () {
    const container = this.shadowRoot.querySelector('#tags-container');
    container.innerHTML = '';

    this.selectedItems.forEach((item, index) => {
      const pill = document.createElement('div');
      pill.className = 'tag-pill';
      pill.innerHTML = `
        <span class="tag-name">${this.escapeHtml(item.name || 'Unknown')}</span>
        <button type="button" class="remove-btn" data-index="${index}">×</button>
      `;

      pill.querySelector('.remove-btn').addEventListener('click', () => {
        this.removeItem(index);
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
    const eventName = this.getChangeEventName();
    const propertyName = this.getSelectedPropertyName();
    this.dispatchEvent(new CustomEvent(eventName, {
      bubbles: true,
      composed: true,
      detail: {
        [propertyName]: this.selectedItems,
        [`${propertyName.replace(/s$/, '')}Ids`]: this.selectedItems.map(i => i._id)
      }
    }));
  }

  // Public methods for getting/setting values
  getSelectedItems () {
    return this.selectedItems;
  }

  getSelectedIds () {
    return this.selectedItems.map(i => i._id);
  }

  setSelectedItems (items) {
    // items can be array of { _id, name, ... } or array of IDs
    if (items && items.length > 0) {
      // If first item is a string/ID, we need to handle it
      if (typeof items[0] === 'string' || items[0]._id) {
        this.selectedItems = items.map(item => {
          if (typeof item === 'string') {
            return { _id: item, name: 'Loading...' };
          }
          return { _id: item._id, name: item.name || 'Unknown', ...item };
        });
        this.updateTagsDisplay();
      }
    } else {
      this.selectedItems = [];
      this.updateTagsDisplay();
    }
  }

  clear () {
    this.selectedItems = [];
    this.updateTagsDisplay();
    this.shadowRoot.querySelector('#search-input').value = '';
    this.hideSuggestions();
  }
}

export default TagSelectorBase;

