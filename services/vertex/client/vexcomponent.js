// Shared Socket.io connection, initialized once and reused
let vexSocket = null;

class VexComponent extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.state = {
            vex: null,
            viewMode: 'normal', // 'collapsed', 'normal', 'thread'
            vexId: null
        };
        
        // Bind methods once
        this._handleNewChildEvent = this._handleNewChildEvent.bind(this);
        this.handleNewChild = this.handleNewChild.bind(this);
        this.fetchVexData = this.fetchVexData.bind(this);
    }

    static get observedAttributes() {
        return ['view-mode']; // Removed 'vex-id' from observed attributes
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (name === 'view-mode') {
            const previousMode = this.state.viewMode;
            this.state.viewMode = newValue;
            
            // Simple mode handling - if entering thread mode, fetch children and join socket room
            if (newValue === 'thread' && previousMode !== 'thread') {
                if (this.state.vexId) {
                    this.joinSocketRoom();
                    // log vexId
                    console.log('updating children in attributeChangedCallback', this.state.vexId);
                    this.updateChildren();
                }
            } else if (previousMode === 'thread' && newValue !== 'thread') {
                this.leaveSocketRoom();
            }
            
            this.render();
        }
    }
    
    // Socket management methods
    ensureSocketConnection() {
        if (!vexSocket && window.io) {
            vexSocket = io(window.location.hostname + ':3005', {
                transports: ['websocket', 'polling']
            });
        }
        
        if (vexSocket && !this._hasSocketListener) {
            vexSocket.on('newChild', this._handleNewChildEvent);
            this._hasSocketListener = true;
        }
    }
    
    joinSocketRoom() {
        this.ensureSocketConnection();
        if (vexSocket && this.state.vexId) {
            vexSocket.emit('joinVexRoom', this.state.vexId);
        }
    }
    
    leaveSocketRoom() {
        if (vexSocket && this.state.vexId) {
            vexSocket.emit('leaveVexRoom', this.state.vexId);
        }
    }
    
    _handleNewChildEvent(data) {
        if (this.state.vexId === data.parentId) {
            this.handleNewChild(data.child);
        }
    }
    
    handleNewChild(childData) {
        if (!this.state.vex || this.state.viewMode !== 'thread') return;
        // remove any item of class 'loading' from vex-children-list
        const loadingMessage = this.shadowRoot.getElementById('vex-children-list').querySelector('.loading');
        if (loadingMessage) {
            loadingMessage.remove();
        }

        
        const isExistingChild = this.state.vex.children.some(child => 
            (typeof child === 'object' && child._id === childData._id) || child === childData._id
        );
        
        if (!isExistingChild) {
            this.state.vex.children.push(childData);
            const childrenContainer = this.shadowRoot.getElementById('vex-children-list');
            if (childrenContainer) {
                const childComponent = document.createElement('vex-display');
                childComponent.vex = childData;
                childComponent.setAttribute('view-mode', 'normal');
                childrenContainer.prepend(childComponent);
            }
        }
    }

    // Vex data getters/setters and fetching
    set vex(data) {
        this.state.vex = data;
        if (data && data._id) {
            this.state.vexId = data._id;
        }
        this.render();
    }

    get vex() {
        return this.state.vex;
    }

    async fetchVexData() {
        if (!this.state.vexId) return;

        try {
            console.log('fetch main vex')
            const response = await fetch(`/vex/vertex/${this.state.vexId}`);
            if (!response.ok) throw new Error(`Failed to fetch vex data: ${response.statusText}`);
            
            this.state.vex = await response.json();
            this.render();
            
            // If in thread mode, fetch children after main vex data
            if (this.state.viewMode === 'thread') {
                console.log('updating children in fetchVexData');
                this.updateChildren();
            }
        } catch (error) {
            console.error('Error fetching vex data:', error);
        }
    }

    // Simple function to fetch and render children once
    async updateChildren() {
        console.log("updating children for", this.state.vexId);

        if (!this.state.vexId) {
            console.log('No vexId to fetch children for');
            return;
        }

        try {
            // Use the new endpoint to fetch all children in one call
            const response = await fetch(`/vex/vertex/${this.state.vexId}/children`);
            if (!response.ok) throw new Error(`Failed to fetch children: ${response.statusText}`);
            
            const childrenData = await response.json();
            
            // Update the children in the state
            if (this.state.vex) {
                this.state.vex.children = childrenData;
            }
            
            // Update the UI
            const childrenContainer = this.shadowRoot.getElementById('vex-children-list');
            if (childrenContainer) {
                
                if (!childrenData.length) {
                    // Show "No replies" message if there are no children
                    childrenContainer.innerHTML = '<div class="loading">No replies yet.</div>';
                } else {
                    // Render the children components
                    this.renderChildComponents();
                }
            }
        } catch (error) {
            console.error('Error fetching children data:', error);
            
            // Show error in UI
            const childrenContainer = this.shadowRoot.getElementById('vex-children-list');
            if (childrenContainer) {
                childrenContainer.innerHTML = '<div class="loading">Error loading replies.</div>';
            }
        }
    }

    // Rendering methods
    render() {
        const { vex, viewMode } = this.state;
        if (!vex) return;
        
        // Basic template without child components (they'll be added after)
        this.shadowRoot.innerHTML = `
            <style>
                .vex {
                    border-bottom: 1px dotted #CCC;
                    padding: 10px;
                    margin: 10px 0;
                    margin-top:30px;
                    border: none;
                    /* background-color: #f0f8ff; */
                    -webkit-border-radius: 11px;
                    border-radius: 11px;
                    background: #acc3c5;
                    -webkit-box-shadow: 11px 11px 25px #8fa2a4, -11px -11px 25px #c9e4e6;
                    box-shadow: 11px 11px 25px #8fa2a4, -11px -11px 25px #c9e4e6;
                }
                .vex.collapsed {
                    cursor: pointer;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                    font-size: 0.8em;
                }
                .vex.collapsed > #vex-content { font-size: 0.8em; }
                .vex.collapsed > #vex-actions { display:none; }
                .vex > #vex-children { display: none; }
                .vex.thread > #vex-children {
                    display: block;
                    margin-left: 20px;
                    margin-top: 25px;
                }
                .vex.thread {
                   
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
                #vex-children {
                    margin-left: 20px;
                    padding-left: 10px;
                    border-left: 2px dashed #ccc;
                }
                #reply-input-container {
                    /* margin-bottom: 15px; */
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
            <div class="vex ${viewMode === 'collapsed' ? 'collapsed' : ''} ${viewMode === 'thread' ? 'thread' : ''}">
                <div id="vex-content">${this.vex.content}</div>
                <div id="vex-actions">
                    <button id="upvote">up</button>
                    <button id="downvote">down</button>
                    <button id="share">Share</button>
                    
                </div>
            </div>
            <div id="vex-children">
                ${viewMode === 'thread' ? `
                    <div id="reply-input-container">
                        <vex-input parent-vex='["${vex._id}"]'></vex-input>
                    </div>` : ''}
                <div id="vex-children-list" data-random-id="${Math.floor(Math.random() * 100000)}">
                    ${viewMode === 'thread' ? 
                      '<div class="loading">Loading replies...</div>' : ''}
                </div>
            </div>
        `;

        this.addEventListeners();
    }

   
    // Render child components separately after the main render
    renderChildComponents() {
        const { vex } = this.state;

        const childrenContainer = this.shadowRoot.getElementById('vex-children-list');
        if (!childrenContainer) return;
        
        // Clear existing content including any loading indicator
        childrenContainer.innerHTML = '';
            
        // Add each child as a component
        vex.children.forEach(child => {
            if (typeof child !== 'object' || child === null || Object.keys(child).length <= 1) return;
            
            const childComponent = document.createElement('vex-display');
            childComponent.vex = child;
            childComponent.setAttribute('view-mode', 'normal');
            childrenContainer.appendChild(childComponent);
        });
    }

    // Event handling and lifecycle
    setViewMode(mode) {
        this.setAttribute('view-mode', mode);
    }

    addEventListeners() {
        const vexElement = this.shadowRoot.querySelector('.vex');
        vexElement.addEventListener('click', e => {
            console.log('Vex clicked', this.state.vexId);
            if (this.state.viewMode === 'collapsed') {
                this.setViewMode('normal');
                return;
            }
            if( this.state.viewMode === 'normal') {
                this.setViewMode('thread');
                return;
            }
            if (this.state.viewMode === 'thread') {
                this.setViewMode('normal');
                return;
            }
        });

        // Add click handlers with consistent pattern
        const buttons = {
            'upvote': () => console.log('Upvoted'),
            'downvote': () => console.log('Downvoted'),
            'share': () => console.log('Shared'),
        //     'open': () => this.setViewMode('thread'),
        //     'collapse': () => this.setViewMode('collapsed')
        };
        
        Object.entries(buttons).forEach(([id, handler]) => {
            this.shadowRoot.getElementById(id)?.addEventListener('click', e => {
                e.stopPropagation();
                handler();
            });
        });
    }

    connectedCallback() {
        const vexId = this.getAttribute('vex-id');
        if (vexId) {
            this.state.vexId = vexId;
            this.fetchVexData();
        } else {
            this.render();
        }
        
        if (this.state.viewMode === 'thread' && this.state.vexId) {
            this.joinSocketRoom();
            // If we already have vex data but in thread mode, fetch children
            if (this.state.vex) {
                console.log('updating children in connectedCallback');
                this.updateChildren();
            }
        }
    }

    disconnectedCallback() {
        if (this.state.viewMode === 'thread' && this.state.vexId) {
            this.leaveSocketRoom();
        }
        
        if (vexSocket && this._hasSocketListener) {
            vexSocket.off('newChild', this._handleNewChildEvent);
            this._hasSocketListener = false;
        }
    }
}

customElements.define('vex-display', VexComponent);