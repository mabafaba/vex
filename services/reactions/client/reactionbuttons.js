
class reactionButtons extends LiveModelElement {
  constructor (id) {
    super('Reaction', id);
    this.attachShadow({ mode: 'open' });
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
    if (!this.live) {
      return;
    }
    const userId = this.userId;
    const reactions = ['upvote', 'downvote', 'flagged', 'offtopic', 'join'];
    this.shadowRoot.innerHTML = `
      <style>
        button[active] { font-weight: bold; }
      </style>
      ${reactions.map(type => {
    const users = this.live[type] || [];
    const active = users.includes(userId);
    return `<button type="button" data-type="${type}" ${active ? 'active' : ''}>
          ${type} (${users.length})
        </button>`;
  }).join(' ')}
    `;
    this.shadowRoot.querySelectorAll('button').forEach(btn => {
      btn.onclick = e => this.toggleReaction(e.target.dataset.type);
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
    }
  }
}

customElements.define('reaction-buttons', reactionButtons);

