class VexList extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.state = {
            parent : null,
            children: [], // Array of vex objects
        };
    }

    set parent(data) {
        this.state.parent = data;
        this.render();
    }
    get parent() {
        return this.state.parent;
    }

    set children(data) {
        this.state.children = data;
        this.render();
    }

    get children() {
        return this.state.items;
    }

    render() {
        const { children } = this.state;

        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: block;
                    padding: 10px;
                    border: 1px solid #ddd;
                    border-radius: 5px;
                    background-color: #f9f9f9;
                }
                #vex-list {
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                    display: none;
                }
            </style>
            <vex-display id="vex-parent"></vex-display>
            <div id="vex-list">
                ${children.map((item, index) => `<vex-display id="vex-${index}"></vex-display>`).join('')}
            </div>
        `;

        this.populateItems();
    }

    populateItems() {
        const { items, parent } = this.state;

        items.forEach((item, index) => {
            const vexDisplay = this.shadowRoot.getElementById(`vex-${index}`);
            if (vexDisplay) {
                vexDisplay.vex = item;
                vexDisplay.setViewMode('collapsed');
            }
        });
    }

    connectedCallback() {
        this.render();
    }
}

customElements.define('vex-list', VexList);