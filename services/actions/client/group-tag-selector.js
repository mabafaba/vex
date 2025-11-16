import TagSelectorBase from './tag-selector-base.js';

class GroupTagSelector extends TagSelectorBase {
  constructor () {
    super();
    this.excludeId = null; // Group ID to exclude from search (e.g., when editing)
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
    return '/vex/groups/search';
  }

  getPlaceholder () {
    return 'Type to search groups...';
  }

  formatSuggestionText (item) {
    return item.name || 'Unknown';
  }

  getChangeEventName () {
    return 'groups-changed';
  }

  getSelectedPropertyName () {
    return 'groups';
  }

  getSearchQueryParams (query) {
    const params = { q: query };
    if (this.excludeId) {
      params.excludeId = this.excludeId;
    }
    return params;
  }

  // Convenience methods for backward compatibility
  getSelectedGroups () {
    return this.getSelectedItems();
  }

  getSelectedGroupIds () {
    return this.getSelectedIds();
  }

  setSelectedGroups (groups) {
    this.setSelectedItems(groups);
  }
}

customElements.define('group-tag-selector', GroupTagSelector);
