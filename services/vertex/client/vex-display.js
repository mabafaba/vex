class VexComponent extends HTMLElement {
  constructor () {
    super();
    this.attachShadow({ mode: 'open' });
    this.state = {
      vex: null,
      viewMode: 'normal' // 'collapsed', 'normal', 'thread', 'square', 'activesquare'
    };
  }

  // Accept vex data only via property
  set vex (vexObj) {
    this.state.vex = vexObj;
    this.render();
  }
  get vex () {
    return this.state.vex;
  }

  static get observedAttributes () {
    return ['view-mode']; // Only observe view-mode
  }

  attributeChangedCallback (name, oldValue, newValue) {
    if (name === 'view-mode' && oldValue !== newValue && oldValue !== null) {
      this.setViewMode(newValue);
      if (newValue === 'thread' && (oldValue !== 'thread' && oldValue !== 'breadcrumb')) {
        this.render();
      }
    }
  }

  render () {
    const { vex, viewMode } = this.state;
    if (!vex) {
      return;
    }
    this.shadowRoot.innerHTML = `
            <style>
                vex-display {
                    background:rgb(244, 222, 253);
                    cursor: pointer;

                }
                vex-display:hover {
                    background:rgb(238, 195, 255);
                    box-shadow: 0 0 10px rgba(255, 255, 255, 0.5);
                    transition: all 0.3s ease-in-out;
                }
                .vex {
                    /* border-bottom: 1px dotted #444; */
                    /* margin: 10px 0; */                  
                    background: none;
                    box-sizing: border-box;
                    transition: all 0.3s ease-in-out;
                }
                .vex-main {
                    background: rgb(225, 222, 253);
                    /* border-radius: 11px; */
                    padding: 10px;
                    cursor: pointer;
                    transition: all 0.3s ease-in-out;
                    position: relative;
                }
                .vex.thread > .vex-main {
                    background-color:rgb(99, 78, 143);
                    color: #FFF;
                    border-bottom-right-radius: 11px;
                    border-bottom-left-radius: 11px;
                    /* border-radius: 11px; */
                    margin-bottom: -12px;
                    z-index:1;
                    position: relative;
                }
                .vex.square .vex-main {
                    width: 100%;
                    height: 100%;
                    border-radius: 11px;
                    padding: 3px;
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                    align-items: center;
                    text-align: center;
                    overflow: hidden;
                    box-sizing: border-box;
                }
                .vex.activesquare .vex-main {
                    width: 100%;
                    height: 100%;
                    border-radius: 11px;
                    padding: 2px;
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                    align-items: center;
                    text-align: center;
                    overflow: hidden;
                    background-color: #4B0082;
                    color: white;
                    border: 2px solid rgb(125, 5, 133);
                    box-sizing: border-box;
                }
                .vex.square .user-name {
                  display: none;
                    font-size: 0.7em;
                    margin-bottom: 2px;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    width: 100%;
                }
                .vex.activesquare .user-name {
                    display: none;
                    font-size: 0.7em;
                    margin-bottom: 2px;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    width: 100%;
                    color: #e0e0e0;
                }
                .vex.square #vex-content {
                    font-size: 0.8em;
                    display: -webkit-box;
                    -webkit-line-clamp: 3;
                    -webkit-box-orient: vertical;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    line-height: 1.2;
                    max-height: 3.6em;
                    box-sizing: border-box;
                    margin: 0px;
                    width: 100%;
                    height: 100%;
                    position: relative;
                    padding: 3px;
                    box-sizing: border-box;

                }
                .vex.activesquare #vex-content {
                    font-size: 0.8em;
                    display: -webkit-box;
                    -webkit-line-clamp: 3;
                    -webkit-box-orient: vertical;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    line-height: 1.2;
                    max-height: 3.6em;
                    margin: 0px;
                    width: 100%;
                    height: 100%;
                    position: relative;
                    padding: 10px;
                    box-sizing: border-box;
                }
                .vex.square vex-reactions {
                    display: none;
                }
                .vex.activesquare vex-reactions {
                    display: none;
                }


                .vex.breadcrumb > * {
                    height: 0;
                    overflow: hidden;
                    padding: 0;
                    margin: 0;
                    pointer-events: none;
                    opacity: 0;
                    transition: height 1s, opacity 1s;
                    border-top-right-radius: 11px;
                    border-top-left-radius: 11px;
                }

                .vex.breadcrumb > .vex-main {
                    font-size: 0.6em;
                    padding: 5px;
                    border-radius: 7px;
                    height: 15px;
                    background-color: #e0e0e0;
                    color: #333;
                    display: inline-block;
                    text-align: center;
                    cursor: pointer;
                    opacity: 0.8;
                    width: 20px;
                    height:1.5em;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                }

                .vex.thread {
                  border-bottom: none;
                }
                .vex.normal > reply-input-container {
                    height: 0;
                    overflow: hidden;
                    padding: 0;
                    margin: 0;
                    pointer-events: none;
                    opacity: 0;
                    transition: height 1s, opacity 1s;
                }

                .vex.normal > .vex-main {
                    border-radius: 11px;
                    margin: 5px;
                    
                }
                
                .vex.hidden {
                    height: 0;
                    width:0;
                    overflow: hidden;
                    padding: 0;
                    margin: 0;
                    pointer-events: none;
                    opacity: 0;
                    
                    transition: height 3s, opacity 3s ease-in;
                }

                #vex-content { margin-bottom: 10px; }
                #vex-actions {
                    display: flex;
                    justify-content: space-between;
                }
                #vex-actions button {
                    background-color: #CCCCCC;
                    color: white;
                    border: none;
                    padding: 5px 10px;
                    font-size: 9px;
                    border-radius: 5px;
                    cursor: pointer;
                }

                #vex-actions button:hover { background-color: #999999; }
                #vex-actions button:disabled {
                    background-color: #ccc;
                    cursor: not-allowed;
                }

                #reply-input-container {
                    margin-bottom: 5px;
                    margin-top: 5px;
                }
                .loading {
                    text-align: center;
                    font-style: italic;
                    color: #666;
                    margin: 10px 0;
              }
                .user-name {
                    color: #666;
                    font-size: 0.8em;
                    margin-bottom: 5px;
                }
                .timestamp {
                    color: #888;
                    font-size: 0.7em;
                    margin-left: 8px;
                }
                .square {
                    width: 70px;
                    height: 30px;
                    font-size: 0.5em;
                    padding: 0px;
                    margin: 0px;
                    position: relative;
                    overflow: hidden;
                }
                .activesquare {
                    width: 70px;
                    height: 30px;
                    font-size: 0.5em;
                    padding: 0px;
                    margin: 0px;
                    position: relative;
                    overflow: hidden;
                }
                .square .content {
                    width: 100%;
                    height: 100%;
                    position: relative;
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                    align-items: center;
                    text-align: center;
                }
                .activesquare .content {
                    width: 100%;
                    height: 100%;
                    position: relative;
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                    align-items: center;
                    text-align: center;
                }
                .square .title {
                    font-size: 11px;
                    margin: 0;
                    padding: 0 2px;
                    max-width: 100%;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }
                .activesquare .title {
                    font-size: 11px;
                    margin: 0;
                    padding: 0 2px;
                    max-width: 100%;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }
                .square .description {
                    font-size: 9px;
                    margin: 2px 0 0;
                    padding: 0 2px;
                    max-width: 100%;
                    display: -webkit-box;
                    -webkit-line-clamp: 2;
                    -webkit-box-orient: vertical;
                    overflow: hidden;
                }
                .activesquare .description {
                    font-size: 9px;
                    margin: 2px 0 0;
                    padding: 0 2px;
                    max-width: 100%;
                    display: -webkit-box;
                    -webkit-line-clamp: 2;
                    -webkit-box-orient: vertical;
                    overflow: hidden;
                }


                .vex.collapsed .user-name {
                  display: none;
                }

                .vex.collapsed #vex-content {
                  font-size: 0.6em;
                  color: #888;
                  margin-bottom: 0;
                  padding: 2px 4px;
                  line-height: 1.1;
                }

                .vex.collapsed reaction-buttons,
                .vex.collapsed vex-reactions,
                .vex.collapsed #reply-input-container {
                  display: none !important;
                }

                .vex.collapsed .vex-main {
                  
                  height: 28px;
                  color: #888;
                  border-radius: 5px;
                  font-size: 0.8em;
                  overflow: hidden;
                  box-sizing: border-box;
                  cursor: pointer;
                }

                .vex.collapsed {
                  width: 100%;
                  height: 28px;
                  min-height: 0;
                  min-width: 0;
                  padding: 0;
                  margin: 0;
                  overflow: hidden;
                  opacity: 0.85;
                  box-sizing: border-box;
                }

                .location-name {
                    position: absolute;
                    top: 8px;
                    right: 8px;
                    font-size: 0.65em;
                    color: #666;
                    padding: 2px 6px;
                    border-radius: 4px;
                    max-width: 60%;
                    word-wrap: break-word;
                    line-height: 1.2;
                    text-align: right;
                }

                .vex.thread .location-name {
                    color: #fff;
                    max-width: 70%;
                }
                .vex.thread .location-name span {
                    color: rgba(255, 255, 255, 0.7);
                }

            </style>
            <div class="vex">
                <div class="vex-main">
                    ${vex.createdBy ? `<div class="user-name">
                        ${vex.createdBy.username}
                        <span class="timestamp">${this.formatTimestamp(vex.createdAt)}</span>
                    </div>` : ''}
                    ${vex.locations && vex.locations.length > 0 ?
    `<div class="location-name">${vex.locations.map((loc, i, arr) =>
      i === 0 ? `<strong>${loc.properties.name}</strong>` : `<span style="color: #999">${loc.properties.name}</span>`
    ).reverse().join(' > ')}</div>`
    : ''}
                    <div id="vex-content">${vex.content}</div>
                    <reaction-buttons user-id="${this.state.userid}"></reaction-buttons>
                </div>
            </div>
        `;

    this.addEventListeners();
    this.entranceAnimation();

    const reactionButtons = this.shadowRoot.querySelector('reaction-buttons');
    if (reactionButtons) {
      if (!vex.reactions) {
        console.warn('vex has no reactions id');
      } else {
        reactionButtons.connect('/vex/reactions', vex.reactions);
      }
    }

    // Set the correct class for view mode
    const vexDiv = this.shadowRoot.querySelector('.vex');
    if (vexDiv) {
      vexDiv.classList.remove('collapsed', 'thread', 'normal', 'breadcrumb', 'square', 'activesquare', 'hidden');
      vexDiv.classList.add(this.state.viewMode);
    }
  }

  // Event handling and lifecycle
  setViewModeAttribute (mode) {
    this.setAttribute('view-mode', mode);
  }

  addEventListeners () {
    const vexElement = this.shadowRoot.querySelector('.vex');
    // Remove any existing click listeners to prevent duplicates
    const newElement = vexElement.cloneNode(true);
    vexElement.parentNode.replaceChild(newElement, vexElement);
    // Get reference to the new element
    const updatedVexElement = this.shadowRoot.querySelector('.vex-main');
    // Add default click handler
    updatedVexElement.addEventListener('click', e => {
      // Emit custom event with vex id (no bubbling, no composition)
      this.dispatchEvent(new CustomEvent('vex-main-click', {
        detail: { vexId: this.state.vex?._id },
        bubbles: true,
        composed: true
      }));
    });
  }

  async connectedCallback () {
    this.state.viewMode = this.getAttribute('view-mode') || 'normal';
    this.render();
    // this.entranceAnimation();
  }

  disconnectedCallback () {
    // No more socket logic needed
  }

  entranceAnimation () {
    const element = this.shadowRoot.querySelector('.vex-main');
    if (!element) {
      return;
    }

    // Add ounce and gloss animation
    element.style.animation = 'bounceAndGloss 0.3s ease-in-out';

    // Remove the animation class after it completes to allow retriggering
    element.addEventListener('animationend', () => {
      element.style.animation = '';
    });

    // Define the keyframes for the animation
    const style = document.createElement('style');
    style.textContent = `
            @keyframes bounceAndGloss {
                0% {
                    transform: scale(1);
                    
                }
                50% {
                    transform: scale(1.05);

                }
                
                100% {
                    transform: scale(1);
                }
            }

        `;
    this.shadowRoot.appendChild(style);
  }

  // Restore changeViewMode for class updates only (no data fetching or rendering)
  setViewMode (to) {
    this.state.viewMode = to;
    const vexDiv = this.shadowRoot.querySelector('.vex');
    if (!vexDiv) {
      return;
    }
    vexDiv.classList.remove('collapsed', 'thread', 'normal', 'breadcrumb', 'square', 'activesquare', 'hidden');
    vexDiv.classList.add(to);
  }

  formatTimestamp (dateStr) {
    if (!dateStr) {
      return '';
    }
    const date = new Date(dateStr);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    if (isToday) {
      return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
    } else {
      return date.toLocaleDateString('en-US', {
        year: '2-digit',
        month: '2-digit',
        day: '2-digit'
      }).replace(/\//g, '-');
    }
  }
}

customElements.define('vex-display', VexComponent);
