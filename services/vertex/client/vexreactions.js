class VexReactions extends HTMLElement {
  constructor () {
    super();
    this.attachShadow({ mode: 'open' });
    this.reactions = {
      upvote: [],
      downvote: [],
      flagged: [],
      offtopic: []
    };
  }

  connectedCallback () {
    this.vexId = this.getAttribute('vex-id');
    const reactionsFromAttribute = JSON.parse(this.getAttribute('vex-reactions') || '{}');
    console.log('reactionsFromAttribute', reactionsFromAttribute);
    this.reactions = {
      upvote: reactionsFromAttribute.upvote || [],
      downvote: reactionsFromAttribute.downvote || [],
      flagged: reactionsFromAttribute.flagged || [],
      offtopic: reactionsFromAttribute.offtopic || []
    };

    console.log('this.reactions after parsing', this.reactions);
    this.render();
  }

  render () {
    this.shadowRoot.innerHTML = `
            <style>
                .reactions {
                    display: flex;
                    justify-content: space-between;
                }
                button {
                    background-color: #CCCCCC;
                    color: white;
                    border: none;
                    padding: 5px 10px;
                    font-size: 9px;
                    border-radius: 5px;
                    cursor: pointer;
                }
                button:hover { background-color: #999999; }
                button:disabled {
                    background-color: #ccc;
                    cursor: not-allowed;
                }
            </style>
            <div class="reactions">
                <button id="upvote">up (${(this.reactions.upvote || []).length || 0})</button>
                <button id="downvote">down (${(this.reactions.downvote || []).length || 0})</button>              
                <button id="flagged">Flag (${(this.reactions.flagged || []).length || 0})</button>  
                <button id="offtopic">Off-Topic (${(this.reactions.offtopic || []).length || 0})</button>
            </div>
        `;
    this.addEventListeners();
  }

  addEventListeners () {
    const buttons = ['upvote', 'downvote', 'flagged', 'offtopic'];

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
