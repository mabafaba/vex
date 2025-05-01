class vexModerationComponent extends HTMLElement {
  constructor () {
    super();
    const shadow = this.attachShadow({ mode: 'open' });
    this.states = ['flag', 'offtopic', 'downvote', 'none', 'upvote', 'join', 'pin'];
    this.stateIcons = {
      flag: 'fa-solid fa-flag',
      offtopic: 'fa-solid fa-circle-exclamation',
      downvote: 'fa-solid fa-thumbs-down',
      none: 'fa-regular fa-circle',
      upvote: 'fa-solid fa-thumbs-up',
      join: 'fa-solid fa-users',
      pin: 'fa-solid fa-thumbtack'
    };
    this.neutralStateIndex = 3;
    this.currentStateIndex = this.neutralStateIndex;
    this.currentState = this.states[this.currentStateIndex];
    this.render();
  }

  render () {
    this.shadowRoot.innerHTML = `
        <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css" rel="stylesheet">
        <style>
                        button {
                                background-color:rgb(204, 204, 204);
                                color: white;
                                border: none;
                                padding: 5px 3px;
                                font-size: 14px;
                                cursor: pointer;
                                position: relative;
                                transition: all 0.2s ease;
                                width:40px;
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
                                background-color: #AAAAAA;
                        }
                        button:active {
                                background-color: #888888;
                        }
                        #current-state {
                                position: relative;
                                left:0%;
                                overflow: visible;
                                width:80px;
                                height: 80px;
                                background-color: #CCCCCC;
                                font-size: 54px;
                                display: flex;
                                align-items: center;
                                justify-content: center;
                                padding: 0 10px;
                                flex-direction: column;
                        }

                        #current-state > i {
                            left:0%;
                            position: relative;
                        }
                        

                        button {
                                display: flex;
                                align-items: center;
                                justify-content: center;
                                flex-direction: column;
                        }
                        .label {
                                font-size: 10px;
                                color: black;
                                margin-top: 2px;
                        }
                        </style>
                        <div style="display: flex; justify-content: center; width: 100%; gap: 0;">
                        <button id='down'>
                                    <i class="${this.stateIcons[this.states[Math.max(this.currentStateIndex - 1, 0)]]}"></i>
                                    <span class="label">Down</span>
                        </button>
                        <div id="current-state">
                                <i class="${this.stateIcons[this.currentState]}"></i>
                                <span class="label">${this.currentState}</span>
                        </div>
                        <button id='up'>
                                <i class="${this.stateIcons[this.states[Math.min(this.currentStateIndex + 1, this.states.length - 1)]]}"></i>
                                <span class="label">Up</span>
                        </button>
                        </div>
                `;
  }

  connectedCallback () {
    this.shadowRoot.querySelector('#up').addEventListener('click', () => {
      this.goUpState();
    });
    this.shadowRoot.querySelector('#down').addEventListener('click', () => {
      this.goDownState();
    });
    this.updateState('none');
  }

  goUpState () {
    if (this.currentStateIndex < this.states.length - 1) {
      this.currentStateIndex++;
    }
  }

  goDownState () {
    if (this.currentStateIndex > 0) {
      this.currentStateIndex--;
      this.updateState('down');
    }
  }
}

customElements.define('vex-moderation', vexModerationComponent);
