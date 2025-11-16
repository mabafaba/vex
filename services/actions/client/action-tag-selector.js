import TagSelectorBase from './tag-selector-base.js';

class ActionTagSelector extends TagSelectorBase {
  constructor () {
    super();
    this.excludeId = null; // Action ID to exclude from search (e.g., when editing)
  }

  static get observedAttributes () {
    return ['exclude-id'];
  }

  attributeChangedCallback (name, oldValue, newValue) {
    if (name === 'exclude-id') {
      this.excludeId = newValue || null;
    }
  }

  getSearchEndpoint () {
    return '/vex/actions/search';
  }

  getPlaceholder () {
    return 'Type to search actions...';
  }

  formatSuggestionText (item) {
    if (item.date) {
      const dateStr = new Date(item.date).toLocaleDateString();
      return `${item.name} (${dateStr})`;
    }
    return item.name || 'Unknown';
  }

  getChangeEventName () {
    return 'actions-changed';
  }

  getSelectedPropertyName () {
    return 'actions';
  }

  getSearchQueryParams (query) {
    const params = { q: query };
    if (this.excludeId) {
      params.excludeId = this.excludeId;
    }
    return params;
  }

  // Convenience methods
  getSelectedActions () {
    return this.getSelectedItems();
  }

  getSelectedActionIds () {
    return this.getSelectedIds();
  }

  setSelectedActions (actions) {
    this.setSelectedItems(actions);
  }
}

customElements.define('action-tag-selector', ActionTagSelector);

