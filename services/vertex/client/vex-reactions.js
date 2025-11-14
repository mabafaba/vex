class VexReactionsUI extends ReactiveStateElement {
  render () {
    const { activeType = '', isJoined = false, upvoteCount = 0, downvoteCount = 0, flaggedCount = 0, offtopicCount = 0, joinCount = 0 } = this.state;
    this.innerHTML = `
      <style>
      .reactions { display: flex; width: 100%; overflow: hidden; }
      button { flex: 1; background-color: #0000; color: white; border: none; padding: 5px 3px; font-size: 9px; cursor: pointer; position: relative; transition: all 0.2s ease; }
      button:not(:first-child) { margin-left: -1px; }
      button:first-child { border-top-left-radius: 5px; border-bottom-left-radius: 5px; }
      button:last-child { border-top-right-radius: 5px; border-bottom-right-radius: 5px; }
      button:hover { background-color: #0000; color: #fff; z-index: 1; }
      button:disabled { background-color: #ccc; cursor: not-allowed; }
      .join-button {}
      button.active {}
      .upvote.active {}
      .downvote.active {}
      .flagged.active {}
      .offtopic.active {}
      </style>
      <div class="reactions">
      <button id="flagged" class="${activeType === 'flagged' ? 'active' : ''}">Flag (${flaggedCount})</button>
      <button id="offtopic" class="${activeType === 'offtopic' ? 'active' : ''}">Off-Topic (${offtopicCount})</button>
      <button id="downvote" class="${activeType === 'downvote' ? 'active' : ''}">down (${downvoteCount})</button>
      <button id="upvote" class="${activeType === 'upvote' ? 'active' : ''}">up (${upvoteCount})</button>
      <button id="join" class="join-button ${isJoined ? 'active' : ''}">${isJoined ? 'Leave' : 'Join'} (${joinCount})</button>
      </div>
    `;
    this.addEventListeners();
  }

  addEventListeners () {
    const buttons = ['upvote', 'downvote', 'flagged', 'offtopic', 'join'];
    buttons.forEach(buttonId => {
      const button = this.querySelector(`#${buttonId}`);
      if (button) {
        button.onclick = e => {
          e.stopPropagation();
          this.dispatchEvent(new CustomEvent('reaction', { detail: { type: buttonId }, bubbles: true, composed: true }));
        };
      }
    });
  }
}
customElements.define('vex-reactions-ui', VexReactionsUI);

class VexReactions extends HTMLElement {
  constructor () {
    super();
    this.attachShadow({ mode: 'open' });
    this._reactions = {
      upvote: [],
      downvote: [],
      flagged: [],
      offtopic: [],
      join: []
    };
    this._userId = null;
  }

  connectedCallback () {
    this.vexId = this.getAttribute('vex-id');
    const reactionsFromAttribute = JSON.parse(this.getAttribute('vex-reactions') || '{}');
    this._reactions = {
      upvote: reactionsFromAttribute.upvote || [],
      downvote: reactionsFromAttribute.downvote || [],
      flagged: reactionsFromAttribute.flagged || [],
      offtopic: reactionsFromAttribute.offtopic || [],
      join: reactionsFromAttribute.join || []
    };
    // unique the reactions
    this._reactions.upvote = [...new Set(this._reactions.upvote)];
    this._reactions.downvote = [...new Set(this._reactions.downvote)];
    this._reactions.flagged = [...new Set(this._reactions.flagged)];
    this._reactions.offtopic = [...new Set(this._reactions.offtopic)];
    this._reactions.join = [...new Set(this._reactions.join)];
    this._userId = window.state && window.state.userid;
    this.render();
  }

  render () {
    this.shadowRoot.innerHTML = '<vex-reactions-ui></vex-reactions-ui>';
    const ui = this.shadowRoot.querySelector('vex-reactions-ui');
    // Set all state as properties on the state object
    ui.state.activeType = this._getActiveType() ?? '';
    ui.state.isJoined = this._reactions.join.includes(this._userId);
    ui.state.upvoteCount = this._reactions.upvote.length;
    ui.state.downvoteCount = this._reactions.downvote.length;
    ui.state.flaggedCount = this._reactions.flagged.length;
    ui.state.offtopicCount = this._reactions.offtopic.length;
    ui.state.joinCount = this._reactions.join.length;
    ui.addEventListener('reaction', e => this.handleReaction(e.detail.type));
  }

  _getActiveType () {
    if (!this._userId) {
      return null;
    }
    if (this._reactions.upvote.includes(this._userId)) {
      return 'upvote';
    }
    if (this._reactions.downvote.includes(this._userId)) {
      return 'downvote';
    }
    if (this._reactions.flagged.includes(this._userId)) {
      return 'flagged';
    }
    if (this._reactions.offtopic.includes(this._userId)) {
      return 'offtopic';
    }
    return null;
  }

  async handleReaction (type) {
    const userId = this._userId;
    const hasReacted = (this._reactions[type] || []).includes(userId);
    if (hasReacted) {
      const response = await this.postReaction(type, false);
      if (!response.ok) {
        console.error('Failed to remove reaction', response);
      }
      this._reactions[type] = (this._reactions[type] || []).filter(id => id !== userId);
    } else {
      const response = await this.postReaction(type, true);
      if (!response.ok) {
        console.error('Failed to add reaction', response);
      }
      this._reactions[type].push(userId);
    }
    this.render();
  }

  postReaction (type, on) {
    return fetch(`/vex/vertex/${this.vexId}/react`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, on })
    });
  }
}
customElements.define('vex-reactions', VexReactions);

