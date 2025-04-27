class VexInputComponent extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });

    this.shadowRoot.innerHTML = `
            <style>
                .vex-container {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    margin: 0 auto;
                    box-sizing: border-box;
                    border: 1px solid #ccc; 
                    border-radius: 24px;
                    padding: 8px 12px;
                    border-radius: 11px;

                }
                input {
                    width: 100%;
                    padding: 8px 4px;
                    font-size: 16px;
                    border: none;
                    outline: none;
                    background-color: transparent;
                    box-sizing: border-box;
                    
                }
                button {
                    min-width: 36px;
                    height: 36px;
                    font-size: 16px;
                    /* background-color: #007BFF; */
                    /* color: white; */
                    border: none;
                    border-radius: 50%;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-shrink: 0;
                }
                button:hover {
                    background-color: #0056b3;
                }
            </style>
            <div class="vex-container">
                <input type="text" id="vexContent" placeholder="Write your message...">
                <button id="sendButton">→</button>
            </div>
        `;

    this.shadowRoot
      .querySelector("#sendButton")
      .addEventListener("click", () => this.sendVex());
    // Add event listener for Enter key
    this.shadowRoot
      .querySelector("#vexContent")
      .addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
          this.sendVex();
        }
      });
  }

  connectedCallback() {
    // get parent-vex from attribute, or if not set, set to empty array
    this.parents = [this.getAttribute("parent-vex")] || [];
  }

  // listen for changes in the parent-vex attribute
  static get observedAttributes() {
    return ["parent-vex"];
  }
  attributeChangedCallback(name, oldValue, newValue) {
    if (name === "parent-vex") {
      this.parents = [newValue] || [];
    }
  }

  async sendVex() {
    const content = this.shadowRoot.querySelector("#vexContent").value.trim();
    if (!content) {
      alert("Content cannot be empty!");
      return;
    }

    try {
      const response = await fetch("/vex/vertex", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ content, parents: this.parents }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to send vex");
      }

      console.log(response);

      const result = await response.json();
      this.shadowRoot.querySelector("#vexContent").value = "";
    } catch (error) {
      alert(`Error: ${error.message}`);
    }
  }
}

customElements.define("vex-input", VexInputComponent);
