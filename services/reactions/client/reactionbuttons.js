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

    this.live = { counts: {
      flagged: 0,
      offtopic: 0,
      downvote: 0,
      upvote: 0,
      join: 0
    },
    myReactions: []
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
    const count = this.live.counts[type];
    const active = this.live.myReactions.includes(type);
    return `<button type="button" data-type="${type}" ${active ? 'active' : ''} tabindex="0">
            <i class="fa-solid ${this.faIcons[type]}"></i> <span class="reaction-count">${count}</span>
          </button>`;
  }).join('')}
      </div>
    `;
    this.shadowRoot.querySelectorAll('button').forEach(btn => {
      btn.onclick = e => {
        console.log('button clicked', e.currentTarget.dataset.type, 'at', new Date().getMilliseconds());
        e.stopPropagation();
        this.toggleReaction(e.currentTarget.dataset.type);
      };
    });
  }

  toggleReaction (type) {
    // Toggle the reaction in myReactions
    if (this.live.myReactions.includes(type)) {
      this.live.myReactions = this.live.myReactions.filter(t => t !== type);
      this.live.counts[type]--;
    } else {
      this.live.myReactions.push(type);
      this.live.counts[type]++;
      // Remove the reactions that are turned off
      this.reactionTurnsOff[type].forEach(turnOffType => {
        if (this.live.myReactions.includes(turnOffType)) {
          this.live.myReactions = this.live.myReactions.filter(t => t !== turnOffType);
          this.live.counts[turnOffType]--;
        }
      });
    }

    console.log('local edits done at', new Date().getMilliseconds());

    // Post the updated reactions array to the server
    console.log('posting reaction at time', new Date().getMilliseconds());
    fetch(`/vex/reactions/${this.id}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ reactions: this.live.myReactions })
    })
      .then(response => {
        if (!response.ok) {
          throw new Error('Failed to post reaction');
        }
        return response.json();
      })
      .then(data => {
        console.log('Reaction posted successfully at:', new Date().getMilliseconds());
      })
      .catch(error => {
        console.error('Error posting reaction:', error);
      });
  }
}

customElements.define('reaction-buttons', reactionButtons);

