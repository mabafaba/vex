// Generic <vex-list> web component for rendering a list of vex objects
class VexList extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._vexes = [];
    this._viewMode = "normal";
    this._parentVex = null;
    this._socket = null;
    this._onClick = () => {};
  }

  static get observedAttributes() {
    return ["parent-vex", "view-mode"];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === "parent-vex" && oldValue !== newValue) {
      console.log("Parent vex changed:", newValue);
      this.parentVex = newValue;
    }
    if (name === "view-mode" && oldValue !== newValue) {
      this.viewMode = newValue;
    }
  }

  set onClick(callback) {
    this._onClick = callback;
    // remove old event listener
    const vexDisplays = this.shadowRoot.querySelectorAll("vex-display");
    vexDisplays.forEach((vexDisplay) => {
      vexDisplay.removeEventListener("vex-main-click", this._onClick);
    });
    // add new event listener
    vexDisplays.forEach((vexDisplay) => {
      vexDisplay.addEventListener("vex-main-click", this._onClick);
    });
  }

  set parentVex(val) {
    console.log("Setting parent vex:", val);
    console.log("Current parent vex:", this._parentVex);
    if (this._parentVex === val) return;

    if (!this._socket) {
      this.setupSocket();
    }
    if (this._parentVex) {
      console.log("Leaving vex room:", this._parentVex);
      this.leaveRoom(this._parentVex);
    }
    if (val) {
      console.log("joinRoom Joining vex room:", val);
      this.joinRoom(val);
    }
    this._parentVex = val;
    this.fetchVexes();
  }

  get parentVex() {
    return this._parentVex;
  }

  set vexes(list) {
    this._vexes = Array.isArray(list) ? list : [];
    this.render();
  }

  get vexes() {
    return this._vexes;
  }

  set viewMode(mode) {
    this._viewMode = mode;
    this.render();
  }

  get viewMode() {
    return this._viewMode;
  }

  async fetchVexes() {
    if (!this._parentVex) return;
    try {
      const response = await fetch(`/vex/vertex/${this._parentVex}/children`);
      if (!response.ok) throw new Error("Failed to fetch children");
      const children = await response.json();
      this._vexes = children;
      this.render();
    } catch (e) {
      this._vexes = [];
      this.render();
    }
  }

  setupSocket() {
    if (!window.io) {
      console.error("Socket.io not available");
      return;
    }
    if (!this._socket) {
      this._socket = io(window.location.hostname + ":3005", {
        transports: ["websocket", "polling"],
      });

      this._socket.on("newChild", (data) => {
        console.log("New child vex event received:", data);
        if (data.parentId === this._parentVex) {
          console.log("New child vex received:", data);
          this.addVex(data.child);
        }
      });
    }
  }

  joinRoom(vexId) {
    console.log("joining vex room:", vexId);
    this._socket.emit("joinVexRoom", vexId);
  }

  leaveRoom(vexId) {
    console.log("leaving vex room:", vexId);
    this._socket.emit("leaveVexRoom", vexId);
  }

  disconnectedCallback() {
    if (this._socket && this._hasSocketListener && this._parentVex) {
      this._socket.emit("leaveVexRoom", this._parentVex);
      this._socket.off("newChild");
      this._hasSocketListener = false;
    }
  }

  render() {
    this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: block;
                }
                .vex-list {
                    /* display: flex;
                    flex-direction: column;
                    gap: 8px; */
                }
            </style>
            <div class="parent-vex">
            </div>
            <div class="vex-list"></div>
        `;
    const listDiv = this.shadowRoot.querySelector(".vex-list");
    this._vexes.forEach((vex) => {
      const vexDisplay = document.createElement("vex-display");
      vexDisplay.vex = vex; // Pass data via property only
      vexDisplay.setAttribute("view-mode", this._viewMode);
      // Attach event listener directly to vex-display
      vexDisplay.addEventListener("vex-main-click", this._onClick.bind(this));
      listDiv.appendChild(vexDisplay);
    });
  }

  connectedCallback() {
    console.log("VexList connected");
    if (this.hasAttribute("parent-vex")) {
      console.log(
        "found Parent vex attribute:",
        this.getAttribute("parent-vex")
      );
      this.parentVex = this.getAttribute("parent-vex");
    }
    if (this.hasAttribute("view-mode")) {
      this.viewMode = this.getAttribute("view-mode");
    }
    this.fetchVexes();
    this.setupSocket();
    this.render();
  }

  addVex(vex) {
    if (!vex || typeof vex !== "object") return;
    this._vexes.push(vex);
    const listDiv = this.shadowRoot.querySelector(".vex-list");
    const vexDisplay = document.createElement("vex-display");
    vexDisplay.vex = vex; // Pass data via property only
    vexDisplay.setAttribute("view-mode", this._viewMode);
    // Attach event listener directly to vex-display
    vexDisplay.addEventListener("vex-main-click", this._onClick.bind(this));
    listDiv.prepend(vexDisplay);
  }
}

customElements.define("vex-list", VexList);
