class reactionButtons extends LiveModelElement {
  constructor (id) {
    super('Reaction', id);
    this.attachShadow({ mode: 'open' });
    this.reactions = [
      { type: 'flagged' },
      { type: 'offtopic' },
      { type: 'downvote' },
      { type: 'upvote' },
      { type: 'join' }
    ];

    this.myReactions = {
      flagged: false,
      offtopic: false,
      downvote: false,
      upvote: false,
      join: false
    };

    this.reactionTurnsOff = {
      flagged: ['downvote', 'upvote', 'join'],
      offtopic: [],
      downvote: ['upvote'],
      upvote: ['flagged', 'downvote', 'join'],
      join: ['flagged']
    };

    // Use FontAwesome icon classes for each reaction type
    this.faIcons = {
      upvote: 'fa-thumbs-up',
      downvote: 'fa-thumbs-down',
      flagged: 'fa-flag',
      offtopic: 'fa-random', // changed to random for off topic
      join: 'fa-plus'
    };
  }

  connectedCallback () {
    super.connectedCallback && super.connectedCallback();
    if (typeof super.connectedCallback === 'function') {
      super.connectedCallback();
    }
    this.userId = this.getAttribute('user-id');
    this.modelName = 'Reaction';
    if (typeof this.render === 'function') {
      this.render();
    }
  }

  disconnectedCallback () {
    super.disconnectedCallback && super.disconnectedCallback();
    if (typeof super.disconnectedCallback === 'function') {
      super.disconnectedCallback();
    }
  }

  render () {
    console.log('rendering reaction buttons', this.live);

    // console.log('rendering reaction buttons', this.live);
    if (!this.live) {
      return;
    }
    const userId = this.userId;

    this.shadowRoot.innerHTML = `
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css">
      <style>
        :host {
          display: block;
          width: 100%;
        }
        .reaction-group {
          display: flex;
          width: 100%;
        }
        button {
          flex: 1 1 0;
          border:none;
          border-right: none;
          background: rgba(245,245,245,0);
          padding: 0.1em 0;
          margin: 0;
          outline: none;
          font-size: 0.75em;
          line-height: 1.1;
          height: 1.6em;
          transition: background 0.2s, color 0.2s;
          border-radius: 0;
          min-width: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.2em;
          cursor: pointer;
          color: #888;
        }
        button[active] {
          font-weight: bold;
        }
        button[data-type="flagged"][active] {
          color: #a00;
        }
        button[data-type="offtopic"][active] {
          color: #b47b00;
        }
        button[data-type="downvote"][active] {
          color: #1e3a5c;
        }
        button[data-type="upvote"][active] {
          color: #1a7f37;
        }
        button[data-type="join"][active] {
          color: #0077b6;
        }
        button:first-child {
          border-top-left-radius: 999px;
          border-bottom-left-radius: 999px;
        }
        button:last-child {
          border-top-right-radius: 999px;
          border-bottom-right-radius: 999px;
        }
        button:focus {
          z-index: 1;
          position: relative;
        }
        .reaction-label {
          display: none;
        }
        @media (min-width: 500px) {
          .reaction-label {
            display: inline;
          }
        }
      </style>
      <div class="reaction-group">
        ${this.reactions.map(({ type }) => {
    const users = this.live[type] || [];
    const active = users.includes(userId);
    return `<button type="button" data-type="${type}" ${active ? 'active' : ''} tabindex="0">
            <i class="fa-solid ${this.faIcons[type]}"></i> <span class="reaction-count">${users.length}</span>
          </button>`;
  }).join('')}
      </div>
    `;
    this.shadowRoot.querySelectorAll('button').forEach(btn => {
      btn.onclick = e => {
        e.stopPropagation();
        this.toggleReaction(e.currentTarget.dataset.type);
      };
    });
  }

  toggleReaction (type) {
    const userId = this.userId;
    if (!userId || !this.live) {
      return;
    }
    const users = this.live[type] || [];
    if (users.includes(userId)) {
      // Remove reaction
      this.live[type] = users.filter(uid => uid !== userId);
    } else {
      // Add reaction
      this.live[type] = [...users, userId];
      // remove reactions that are turned off by this reaction
      this.reactionTurnsOff[type].forEach(turnOffType => {
        const turnOffUsers = this.live[turnOffType] || [];
        if (turnOffUsers.includes(userId)) {
          this.live[turnOffType] = turnOffUsers.filter(uid => uid !== userId);
        }
      }
      );
    }
  }
}

customElements.define('reaction-buttons', reactionButtons);

