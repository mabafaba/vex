class VexReactions extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
    }

    connectedCallback() {
        this.render();
        this.addEventListeners();
    }

    render() {
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
                <button id="upvote">up</button>
                <button id="downvote">down</button>
                <button id="share">Share</button>
                <button id="open">Open</button>
                <button id="collapse">Collapse</button>
                <button id="bread">Breadcrumb</button>
            </div>
        `;
    }

    addEventListeners() {
        this.shadowRoot.getElementById('upvote').addEventListener('click', e => {
            // Prevent click event on parent object
            e.stopPropagation();
            this.dispatchEvent(new CustomEvent('upvote', { bubbles: true, composed: true }));
        });
        this.shadowRoot.getElementById('downvote').addEventListener('click', e => {
            // Prevent click event on parent object
            e.stopPropagation();
            this.dispatchEvent(new CustomEvent('downvote', { bubbles: true, composed: true }));
        });
        this.shadowRoot.getElementById('share').addEventListener('click', e => {
            // Prevent click event on parent object
            e.stopPropagation();
            this.dispatchEvent(new CustomEvent('share', { bubbles: true, composed: true }));
        });
        this.shadowRoot.getElementById('open').addEventListener('click', e => {
            // Prevent click event on parent object
            e.stopPropagation();
            this.dispatchEvent(new CustomEvent('open', { bubbles: true, composed: true }));
        });
        this.shadowRoot.getElementById('collapse').addEventListener('click', e => {
            // Prevent click event on parent object
            e.stopPropagation();
            this.dispatchEvent(new CustomEvent('collapse', { bubbles: true, composed: true }));
        });
        this.shadowRoot.getElementById('bread').addEventListener('click', e => {
            // Prevent click event on parent object
            e.stopPropagation();
            this.dispatchEvent(new CustomEvent('bread', { bubbles: true, composed: true }));
        });
    }
}

customElements.define('vex-reactions', VexReactions);
