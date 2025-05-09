# LiveModelElement

LiveModelElement is a vanilla JavaScript Web Component that keeps a UI element in real-time sync with a backend database model, with minimal dependencies and maximum feature encapsulation.

**Why use LiveModelElement?**
- **Self-contained vertical slice:** Backend model and frontend UI are tightly coupled and organized together, making features easy to copy, understand, and maintain. Great for rapid prototyping.
- **no black boxes:** keeps backed and frontend in sync in under 100 lines of code. Uses only native browser, Node.js and socket.io, no nested frameworks.
- **Explicit backend-frontend coupling, decoupled from the rest:** Each feature's backend and frontend are tightly coupled with each other, but kept separate from other features, breaking away from the traditional backend-frontend split and reducing cross-feature dependencies.

# LiveModelElement Example: Real-Twime Counter

This example demonstrates how to use LiveModelElement for a real-time synced counter with increment/decrement buttons.

---

## Server (Node.js, Express, Mongoose, Socket.IO)

```js
const counterSchema = new mongoose.Schema({ value: Number });
const Counter = mongoose.model('Counter', counterSchema);
setupLiveModel(io, 'counter', Counter); // Or use your liveModel setup
```

---

## Client JS

```html
<!-- Include Socket.IO client -->
<script src="/socket.io/socket.io.js"></script>
<script type="module">
import LiveModelElement from 'livemodelelement.js';

// Create and assign the socket instance to the static property
const socket = io({ path: '/socket.io' });
LiveModelElement.socket = socket;

class CounterElement extends LiveModelElement {
  connectedCallback() {
    super.connectedCallback();
    this.render();
  }
  render() {
    this.innerHTML = `
      <div>
        <button id="dec">-</button>
        <span id="val">${this.live?.value ?? ''}</span>
        <button id="inc">+</button>
      </div>
    `;
    this.querySelector('#inc').onclick = () => {
      this.live.value = (this.live.value || 0) + 1;
    };
    this.querySelector('#dec').onclick = () => {
      this.live.value = (this.live.value || 0) - 1;
    };
  }
}
customElements.define('live-counter', CounterElement);

// Usage example (replace 'YOUR_COUNTER_ID' with a real document ID)
const counter = document.createElement('live-counter');
counter.setAttribute('model-name', 'Counter');
counter.setAttribute('doc-id', 'YOUR_COUNTER_ID');
document.body.appendChild(counter);
</script>
```

---

## How it works
- The server manages a `Counter` model and syncs changes via Socket.IO rooms.
- The client creates a `<live-counter>` element bound to a specific counter document.
- The socket instance is assigned to `LiveModelElement.socket` before any elements are created.
- All instances (and subclasses) of `LiveModelElement` use the static socket property for communication.
- You just change the value in the `live` proxy and it syncs in real time.
