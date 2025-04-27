// Shared Socket.io connection, initialized once and reused
let vexSocket = null;

class VexComponent extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.state = {
            vex: null,
            viewMode: 'normal', // 'collapsed', 'normal', 'thread'
        };
    }

    // Accept vex data only via property
    set vex(vexObj) {
        this.state.vex = vexObj;
        this.render();
    }
    get vex() {
        return this.state.vex;
    }

    static get observedAttributes() {
        return ['view-mode']; // Only observe view-mode
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (name === 'view-mode' && oldValue !== newValue && oldValue !== null) {
            this.setViewMode(newValue);
            if(newValue === 'thread' && (oldValue !== 'thread' && oldValue !== 'breadcrumb')) {
                this.render();
            }
        }
    }

    render() {
        const { vex, viewMode } = this.state;
        if (!vex) return;
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
                    border-bottom: 1px dotted #CCC;
                   
                    margin: 10px 0;
                    /* margin-top:10px; */
                    border: none;
                    -webkit-border-radius: 11px;
                    border-radius: 11px;
                    /* Remove background from .vex, move to .vex-main */
                    background: none;
                    box-sizing: border-box;
                }
                .vex-main {
                    background: rgb(224, 222, 253);
                    border-radius: 11px;
                    padding: 10px;
                    cursor: pointer;
                }
                .vex.thread .vex-main {
                    background-color: #4B0082;
                    color: white;
                    border: 2px solid rgb(125, 5, 133);
                }

                .vex.thread #vex-actions button {
                    background-color: #7d0585;
                }

                .vex.collapsed {
                    cursor: pointer;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                    font-size: 0.8em;
                }
                .vex.collapsed > .vex-main { font-size: 0.8em; }
                .vex.collapsed > .vex-main > #vex-actions { display:none; }
            

                .vex.breadcrumb > * {
                    height: 0;
                    overflow: hidden;
                    padding: 0;
                    margin: 0;
                    pointer-events: none;
                    opacity: 0;
                    transition: height 1s, opacity 1s;
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

            

                .vex.normal > reply-input-container {
                    height: 0;
                    overflow: hidden;
                    padding: 0;
                    margin: 0;
                    pointer-events: none;
                    opacity: 0;
                    transition: height 1s, opacity 1s;
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
                    /* padding-bottom: 15px; */
                    /* border-bottom: 1px solid #eee; */
                }
                .loading {
                    text-align: center;
                    font-style: italic;
                    color: #666;
                    margin: 10px 0;
                }
            </style>
            <div class="vex">
                <div class="vex-main">
                    <div id="vex-content">${vex.content}</div>
                    <vex-reactions></vex-reactions>
                </div>
            </div>
        `;
        console.log('setting view mode in render', this.state.viewMode)
        this.addEventListeners();
        this.entranceAnimation();
        // Set the correct class for view mode
        const vexDiv = this.shadowRoot.querySelector('.vex');
        if (vexDiv) {
            vexDiv.classList.remove('collapsed', 'thread', 'normal', 'breadcrumb');
            vexDiv.classList.add(this.state.viewMode);
        }
    }
    
    // Event handling and lifecycle
    setViewModeAttribute(mode) {
        this.setAttribute('view-mode', mode);
    }


    addEventListeners() {
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
                bubbles: false,
                composed: false
            }));

        });
        // Handle reaction events
        const reactions = this.shadowRoot.querySelector('vex-reactions');
        if (reactions) {
            reactions.addEventListener('upvote', () => console.log('Upvoted'));
            reactions.addEventListener('downvote', () => console.log('Downvoted'));
            reactions.addEventListener('share', () => console.log('Shared'));
            reactions.addEventListener('open', () => {
                const url = `/vex/vertex/static/test.html?id=${this.state.vex?._id}`;
                window.open(url);
            });
            reactions.addEventListener('collapse', () => {
                this.setViewMode('collapsed');
            });

            reactions.addEventListener('bread', () => {
                console.log('Breadcrumb clicked');
                this.setViewMode('breadcrumb');
            }   );
        }
    }

    async connectedCallback() {
        this.state.viewMode = this.getAttribute('view-mode') || 'normal';
        this.render();
        this.entranceAnimation();
    }

    disconnectedCallback() {
        // No more socket logic needed
    }

    entranceAnimation(){
        const element = this.shadowRoot.querySelector('.vex-main');
        if (!element) return;

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
                    box-shadow: none;
                }
                50% {
                    transform: scale(1.01);
                    box-shadow: 0 0 10px rgba(255, 255, 255, 0.5);
                }
                
                100% {
                    transform: scale(1);
                }
            }

        `;
        this.shadowRoot.appendChild(style);
    }

    // Restore changeViewMode for class updates only (no data fetching or rendering)
    setViewMode(to) {
        this.state.viewMode = to;
        const vexDiv = this.shadowRoot.querySelector('.vex');
        if (!vexDiv) return;
        vexDiv.classList.remove('collapsed', 'thread', 'normal', 'breadcrumb');
        vexDiv.classList.add(to);
    }
    

}

customElements.define('vex-display', VexComponent);