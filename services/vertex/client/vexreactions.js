class VexReactions extends HTMLElement {
  constructor () {
    super();
    this.attachShadow({ mode: 'open' });
    this.reactions = {
      upvote: [],
      downvote: [],
      flagged: [],
      offtopic: [],
      join: []
    };
  }

  connectedCallback () {
    this.vexId = this.getAttribute('vex-id');
    const reactionsFromAttribute = JSON.parse(this.getAttribute('vex-reactions') || '{}');

    this.reactions = {
      upvote: reactionsFromAttribute.upvote || [],
      downvote: reactionsFromAttribute.downvote || [],
      flagged: reactionsFromAttribute.flagged || [],
      offtopic: reactionsFromAttribute.offtopic || [],
      join: reactionsFromAttribute.join || []
    };

    // unique the reactions
    this.reactions.upvote = [...new Set(this.reactions.upvote)];
    this.reactions.downvote = [...new Set(this.reactions.downvote)];
    this.reactions.flagged = [...new Set(this.reactions.flagged)];
    this.reactions.offtopic = [...new Set(this.reactions.offtopic)];
    this.reactions.join = [...new Set(this.reactions.join)];

    this.render();
  }

  render () {
    // Only one reaction can be active at a time (besides join)
    const userId = state.userid;
    const rx = this.reactions;
    const isJoined = rx.join.includes(userId);
    // Determine which reaction is active (flagged, offtopic, downvote, upvote)
    let activeType = null;
    ['flagged', 'offtopic', 'downvote', 'upvote'].forEach(type => {
      if (rx[type].includes(userId)) {
        activeType = type;
      }
    });
    this.shadowRoot.innerHTML = `
      <style>
      .reactions {
        display: flex;
        width: 100%;
        /* box-shadow: -2px -2px 3px rgba(0, 0, 0, 0.2); */
        /* border-radius: 5px; */
        overflow: hidden;
      }
      button {
        flex: 1;
        background-color: #0000;
        color: white;
        border: none;
        padding: 5px 3px;
        font-size: 9px;
        cursor: pointer;
        position: relative;
        transition: all 0.2s ease;
      }
      button:not(:first-child) {
        margin-left: -1px;
      }
      button:first-child {
        border-top-left-radius: 5px;
        border-bottom-left-radius: 5px;
      }
      button:last-child {
        border-top-right-radius: 5px;
        border-bottom-right-radius: 5px;
      }
      button:hover {
        background-color: #0000;
        color: #fff;
        z-index: 1;
      }
      button:disabled {
        background-color: #ccc;
        cursor: not-allowed;
      }
      .join-button {
      }
      button.active {
        
      }
      .upvote.active {
        
      }
      .downvote.active {
        
      }
      .flagged.active {
        
      }
      .offtopic.active {
        
      }
      </style>
      <div class="reactions">
      <button id="flagged" class="${activeType === 'flagged' ? 'active' : ''}">
        Flag (${(rx.flagged || []).length || 0})
      </button>
      <button id="offtopic" class="${activeType === 'offtopic' ? 'active' : ''}">
        Off-Topic (${(rx.offtopic || []).length || 0})
      </button>
      <button id="downvote" class="${activeType === 'downvote' ? 'active' : ''}">
        down (${(rx.downvote || []).length || 0})
      </button>
      <button id="upvote" class="${activeType === 'upvote' ? 'active' : ''}">
        up (${(rx.upvote || []).length || 0})
      </button>
      <button id="join" class="join-button ${isJoined ? 'active' : ''}">
        ${isJoined ? 'Leave' : 'Join'} (${(rx.join || []).length || 0})
      </button>
      </div>
    `;
    this.addEventListeners();
  }

  addEventListeners () {
    const buttons = ['upvote', 'downvote', 'flagged', 'offtopic', 'join'];

    buttons.forEach(buttonId => {
      const button = this.shadowRoot.getElementById(buttonId);

      if (button) {
        button.addEventListener('click', e => {
          e.stopPropagation();
          this.toggleReaction(buttonId);
        });
      }
    });
  }

  async toggleReaction (type) {
    // check if user has already reacted
    const hasReacted = this.reactions[type].includes(state.userid);
    console.log('state.userid', state.userid);
    console.log('this.reactions[type]', this.reactions[type]);
    console.log('hasReacted', hasReacted);

    if (hasReacted) {
      // remove user id from reaction array
      console.log('posting reaction', type, false);
      const response = await this.postReaction(type, false);
      console.log('response', response);
      if (!response.ok) {
        console.error('Failed to remove reaction', response);
      }
      this.reactions[type] = this.reactions[type].filter(id => id !== state.userid);
    } else {
      // add user id to reaction array
      const response = await this.postReaction(type, true);
      console.log('response', response);
      if (!response.ok) {
        console.error('Failed to add reaction', response);
      }
      this.reactions[type].push(state.userid);
    }

    this.render();
  }

  postReaction (type, on) {
    console.log('postReaction', type, on);
    console.log('postReaction', JSON.stringify({ type, on }));
    return fetch(`/vex/vertex/${this.vexId}/react`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ type, on })
    });
  }
}

customElements.define('vex-reactions', VexReactions);
