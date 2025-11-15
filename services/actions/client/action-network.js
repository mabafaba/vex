class Node {
  constructor (id, type, label, data, x, y) {
    this.id = id;
    this.type = type;
    this.label = label;
    this.data = data;
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.ax = 0;
    this.ay = 0;
    this.width = 100;
    this.height = 40;
    this.element = null;
    this.baseTilt = (Math.random() - 0.5) * 4; // Random base tilt between -2 and 2 degrees
    this.swingAmplitude = 0.5 + Math.random() * 1; // Swing amplitude between 0.5 and 1.5 degrees
    this.swingSpeed = 0.5 + Math.random() * 0.5; // Swing speed between 0.5 and 1.0
    this.swingPhase = Math.random() * Math.PI * 2; // Random starting phase
  }

  formatDate (dateString) {
    if (!dateString) {
      return '';
    }
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  createElement (container) {
    // eslint-disable-next-line no-undef
    const selection = d3.select(container)
      .append('div')
      .attr('class', `node node-${this.type}`)
      .attr('data-node-id', this.id)
      .style('left', `${this.x}px`)
      .style('top', `${this.y}px`)
      .style('position', 'absolute');

    // Add title with type tag (always visible)
    const titleDiv = selection.append('div')
      .attr('class', 'node-title');

    titleDiv.append('span')
      .text(this.label);

    titleDiv.append('span')
      .attr('class', `node-type-tag ${this.type}`)
      .text(this.type);

    // Create always-visible container for date and pictures
    const alwaysVisible = selection.append('div')
      .attr('class', 'node-always-visible');

    // Create details container (shown on hover/click)
    const detailsContainer = selection.append('div')
      .attr('class', 'node-details');

    // Add fields based on type
    if (this.type === 'action') {
      this.addActionFields(alwaysVisible, detailsContainer);
    } else if (this.type === 'group') {
      this.addGroupFields(alwaysVisible, detailsContainer);
    }

    // Add click handler to toggle details
    selection.on('click', (event) => {
      event.stopPropagation();
      const isExpanded = selection.classed('expanded');
      selection.classed('expanded', !isExpanded);
    });

    this.element = selection.node();
    const rect = this.element.getBoundingClientRect();
    this.width = rect.width || 120;
    this.height = rect.height || 40;
  }

  addActionFields (alwaysVisible, detailsContainer) {
    const data = this.data;

    // Always visible: date and pictures
    if (data.date) {
      this.addField(alwaysVisible, null, this.formatDate(data.date));
    }

    if (data.pictures && data.pictures.length > 0) {
      data.pictures.forEach(pictureUrl => {
        if (pictureUrl) {
          alwaysVisible.append('img')
            .attr('class', 'node-image')
            .attr('src', pictureUrl)
            .attr('alt', 'Action picture');
        }
      });
    }

    // Join button (always visible)
    alwaysVisible.append('button')
      .attr('class', 'node-action-button join')
      .text('Join')
      .on('click', (event) => {
        event.stopPropagation();
        this.handleJoin(data);
      });

    // Details (shown on hover/click): description, contact, counts, etc.
    if (data.description) {
      this.addField(detailsContainer, null, data.description);
    }

    if (data.contact) {
      this.addField(detailsContainer, null, data.contact);
    }

    if (data.organisers && data.organisers.length > 0) {
      const orgCount = Array.isArray(data.organisers) ? data.organisers.length : 0;
      this.addField(detailsContainer, null, `${orgCount} group(s)`);
    }

    if (data.partOf && data.partOf.length > 0) {
      const partOfCount = Array.isArray(data.partOf) ? data.partOf.length : 0;
      this.addField(detailsContainer, null, `${partOfCount} action(s)`);
    }

    if (data.createdAt) {
      this.addField(detailsContainer, null, this.formatDate(data.createdAt));
    }
  }

  addGroupFields (alwaysVisible, detailsContainer) {
    const data = this.data;

    // Contact button (always visible)
    alwaysVisible.append('button')
      .attr('class', 'node-action-button contact')
      .text('Contact')
      .on('click', (event) => {
        event.stopPropagation();
        this.handleContact(data);
      });

    // Details (shown on hover/click)
    if (data.description) {
      this.addField(detailsContainer, null, data.description);
    }

    if (data.link) {
      this.addField(detailsContainer, null, data.link);
    }

    if (data.contact) {
      this.addField(detailsContainer, null, data.contact);
    }

    if (data.partOf && data.partOf.length > 0) {
      const partOfCount = Array.isArray(data.partOf) ? data.partOf.length : 0;
      this.addField(detailsContainer, null, `${partOfCount} group(s)`);
    }

    if (data.createdAt) {
      this.addField(detailsContainer, null, this.formatDate(data.createdAt));
    }
  }

  handleJoin (actionData) {
    // Dispatch event for join action
    const event = new CustomEvent('action-join', {
      bubbles: true,
      composed: true,
      detail: { action: actionData }
    });
    if (this.element) {
      this.element.dispatchEvent(event);
    }
  }

  handleContact (groupData) {
    // Dispatch event for contact action
    const event = new CustomEvent('group-contact', {
      bubbles: true,
      composed: true,
      detail: { group: groupData }
    });
    if (this.element) {
      this.element.dispatchEvent(event);
    }
  }

  addField (selection, label, value) {
    if (!value) {
      return;
    }

    const field = selection.append('div')
      .attr('class', 'node-field');

    if (label) {
      field.append('span')
        .attr('class', 'node-field-label')
        .text(`${label}: `);
    }

    field.append('span')
      .attr('class', 'node-field-value')
      .text(value);
  }

  resetAcceleration () {
    this.ax = 0;
    this.ay = 0;
  }

  applyForce (fx, fy) {
    this.ax += fx;
    this.ay += fy;
  }

  updateVelocity (damping, maxSpeed) {
    this.vx = (this.vx + this.ax) * damping;
    this.vy = (this.vy + this.ay) * damping;

    const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
    if (speed > maxSpeed) {
      this.vx = (this.vx / speed) * maxSpeed;
      this.vy = (this.vy / speed) * maxSpeed;
    }
  }

  updatePosition () {
    this.x += this.vx;
    this.y += this.vy;
  }

  constrainToBounds (width, height) {
    if (this.x < 0) {
      this.x = 0;
      this.vx *= -0.5;
    } else if (this.x > width - this.width) {
      this.x = width - this.width;
      this.vx *= -0.5;
    }

    if (this.y < 0) {
      this.y = 0;
      this.vy *= -0.5;
    } else if (this.y > height - this.height) {
      this.y = height - this.height;
      this.vy *= -0.5;
    }
  }

  updateDimensions () {
    if (Math.random() < 0.01 && this.element) {
      const rect = this.element.getBoundingClientRect();
      this.width = rect.width || this.width || 100;
      this.height = rect.height || this.height || 40;
    }
  }

  render (time = 0) {
    if (this.element) {
      this.element.style.left = `${this.x}px`;
      this.element.style.top = `${this.y}px`;
      // Animated swing motion (handmade hanging effect)
      const swing = Math.sin(time * this.swingSpeed + this.swingPhase) * this.swingAmplitude;
      const currentTilt = this.baseTilt + swing;
      this.element.style.transform = `rotate(${currentTilt}deg)`;
    }
  }

  getCenter () {
    return {
      x: this.x + this.width / 2,
      y: this.y + this.height / 2
    };
  }

  getHalfDimensions () {
    return {
      width: this.width / 2,
      height: this.height / 2
    };
  }
}

class Network {
  constructor (container, nodes, edges) {
    this.container = container;
    this.nodes = nodes;
    this.edges = edges;
    this.centerAttractionStrength = 0.0;
    this.collisionRepulsionStrength = 0.01;
    this.collisionPadding = 10;
    this.edgeAttractionStrength = 0.001;
    this.unconnectedRepulsionStrength = 0.001;
    this.idealEdgeLength = 200;
    this.maxSpeed = 2;
    this.damping = 0.9;
    this.animationId = null;
    this.buildConnectionMap();
    this.createEdgesSVG();
  }

  buildConnectionMap () {
    // Build a map of connected nodes for quick lookup
    this.connections = new Map();
    this.nodes.forEach(node => {
      this.connections.set(node.id, new Set());
    });

    this.edges.forEach(edge => {
      const sourceId = edge.source.id;
      const targetId = edge.target.id;
      this.connections.get(sourceId).add(targetId);
      this.connections.get(targetId).add(sourceId);
    });
  }

  areConnected (nodeId1, nodeId2) {
    return this.connections.get(nodeId1)?.has(nodeId2) || false;
  }

  createEdgesSVG () {
    const { width, height } = this.getDimensions();
    // eslint-disable-next-line no-undef
    this.edgesSvg = d3.select(this.container)
      .append('svg')
      .attr('class', 'edges-svg')
      .attr('width', width)
      .attr('height', height);

    // eslint-disable-next-line no-undef
    this.edgeSelection = this.edgesSvg.selectAll('.edge')
      .data(this.edges)
      .enter()
      .append('path')
      .attr('class', d => `edge edge-${d.type}`)
      .attr('fill', 'none');
  }

  getDimensions () {
    const w = this.container.offsetWidth || this.container.clientWidth || 600;
    const h = this.container.offsetHeight || this.container.clientHeight || 600;
    return { width: w, height: h };
  }

  dist (x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    return Math.sqrt(dx * dx + dy * dy);
  }

  applyCenterAttraction (node, centerX, centerY) {
    const distToCenter = this.dist(node.x, node.y, centerX, centerY);
    if (distToCenter > 0) {
      const strength = this.centerAttractionStrength * distToCenter;
      node.applyForce(
        ((centerX - node.x) / distToCenter) * strength,
        ((centerY - node.y) / distToCenter) * strength
      );
    }
  }

  applyEdgeAttraction (node) {
    // Attract to connected nodes
    const connectedIds = this.connections.get(node.id);
    if (!connectedIds) {
      return;
    }

    const nodeCenter = node.getCenter();

    connectedIds.forEach(connectedId => {
      const connectedNode = this.nodes.find(n => n.id === connectedId);
      if (!connectedNode || !connectedNode.element) {
        return;
      }

      const otherCenter = connectedNode.getCenter();
      const dx = otherCenter.x - nodeCenter.x;
      const dy = otherCenter.y - nodeCenter.y;
      const distance = this.dist(nodeCenter.x, nodeCenter.y, otherCenter.x, otherCenter.y);

      if (distance > 0) {
        // Attraction force proportional to distance from ideal length
        const diff = distance - this.idealEdgeLength;
        const strength = this.edgeAttractionStrength * diff;
        node.applyForce((dx / distance) * strength, (dy / distance) * strength);
      }
    });
  }

  applyUnconnectedRepulsion (node) {
    // Repel from unconnected nodes
    const nodeCenter = node.getCenter();
    const connectedIds = this.connections.get(node.id) || new Set();

    this.nodes.forEach(otherNode => {
      if (node.id === otherNode.id || !otherNode.element || connectedIds.has(otherNode.id)) {
        return;
      }

      const otherCenter = otherNode.getCenter();
      const dx = nodeCenter.x - otherCenter.x;
      const dy = nodeCenter.y - otherCenter.y;
      const distance = this.dist(nodeCenter.x, nodeCenter.y, otherCenter.x, otherCenter.y);

      if (distance > 0) {
        // Repulsion force inversely proportional to distance
        const force = this.unconnectedRepulsionStrength / (distance);
        node.applyForce((dx / distance) * force, (dy / distance) * force);
      }
    });
  }

  handleCollisions (node) {
    const nodeCenter = node.getCenter();
    const nodeHalf = node.getHalfDimensions();

    this.nodes.forEach(otherNode => {
      if (node.id === otherNode.id || !otherNode.element) {
        return;
      }

      const otherCenter = otherNode.getCenter();
      const otherHalf = otherNode.getHalfDimensions();

      const dx = nodeCenter.x - otherCenter.x;
      const dy = nodeCenter.y - otherCenter.y;
      const distance = this.dist(nodeCenter.x, nodeCenter.y, otherCenter.x, otherCenter.y);

      const minDistX = nodeHalf.width + otherHalf.width + this.collisionPadding;
      const minDistY = nodeHalf.height + otherHalf.height + this.collisionPadding;

      if (Math.abs(dx) < minDistX && Math.abs(dy) < minDistY) {
        if (distance > 0) {
          const overlap = Math.min(minDistX - Math.abs(dx), minDistY - Math.abs(dy));
          if (overlap > 0) {
            const force = this.collisionRepulsionStrength * overlap;
            node.applyForce((dx / distance) * force, (dy / distance) * force);
          }
        } else {
          const angle = Math.random() * Math.PI * 2;
          node.applyForce(
            Math.cos(angle) * this.collisionRepulsionStrength * 10,
            Math.sin(angle) * this.collisionRepulsionStrength * 10
          );
        }
      }
    });
  }

  update () {
    const { width, height } = this.getDimensions();
    const centerX = width / 2;
    const centerY = height / 2;
    const time = Date.now() / 1000; // Time in seconds for animation

    // Update SVG size if container resized
    if (this.edgesSvg) {
      this.edgesSvg.attr('width', width).attr('height', height);
    }

    this.nodes.forEach(node => {
      if (!node.element) {
        return;
      }

      node.resetAcceleration();
      this.applyCenterAttraction(node, centerX, centerY);
      this.applyEdgeAttraction(node);
      this.applyUnconnectedRepulsion(node);
      this.handleCollisions(node);
      node.updateVelocity(this.damping, this.maxSpeed);
      node.updatePosition();
      node.updateDimensions();
      node.constrainToBounds(width, height);
      node.render(time);
    });

    // Update edge positions
    this.updateEdges();
  }

  updateEdges () {
    if (!this.edgeSelection) {
      return;
    }

    const containerRect = this.container.getBoundingClientRect();

    this.edgeSelection.each(function (edge) {
      const sourceNode = edge.source;
      const targetNode = edge.target;

      if (!sourceNode.element || !targetNode.element) {
        return;
      }

      const sourceRect = sourceNode.element.getBoundingClientRect();
      const targetRect = targetNode.element.getBoundingClientRect();

      const x1 = sourceRect.left - containerRect.left + sourceRect.width / 2;
      const y1 = sourceRect.top - containerRect.top + sourceRect.height / 2;
      const x2 = targetRect.left - containerRect.left + targetRect.width / 2;
      const y2 = targetRect.top - containerRect.top + targetRect.height / 2;

      // Calculate control point for hanging rope effect (sag downward)
      const midX = (x1 + x2) / 2;
      const midY = (y1 + y2) / 2;
      const distance = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
      const sag = distance * 0.2; // Sag amount proportional to distance
      const controlY = midY + sag;

      // Create quadratic Bezier curve path (hanging rope)
      const path = `M ${x1} ${y1} Q ${midX} ${controlY} ${x2} ${y2}`;

      // eslint-disable-next-line no-undef
      d3.select(this)
        .attr('d', path);
    });
  }

  animate () {
    this.update();
    this.animationId = requestAnimationFrame(() => this.animate());
  }

  start () {
    setTimeout(() => {
      this.animate();
    }, 50);
  }

  stop () {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }
}

class ActionNetwork extends HTMLElement {
  constructor () {
    super();
    this.actions = [];
    this.groups = [];
    this.attachShadow({ mode: 'open' });
    this.render();
  }

  async connectedCallback () {
    await this.loadData();
    this.renderNetwork();
  }

  async loadData () {
    try {
      const [actionsRes, groupsRes] = await Promise.all([
        fetch('/vex/actions', { credentials: 'include' }),
        fetch('/vex/groups', { credentials: 'include' })
      ]);

      if (actionsRes.ok) {
        this.actions = await actionsRes.json();
      }
      if (groupsRes.ok) {
        this.groups = await groupsRes.json();
      }
    } catch (error) {
      console.error('Error loading data:', error);
    }
  }

  render () {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          padding: 20px;
        }
        .network-container {
          width: 100%;
          height: 600px;
          border: 2px dashed #8b0000;
          border-radius: 8px;
          position: relative;
          overflow: hidden;
          background: #000;
        }
        .node {
          position: absolute;
          cursor: pointer;
          border: 2px solid #8b0000;
          border-radius: 4px;
          padding: 8px 12px;
          min-width: 120px;
          max-width: 250px;
          text-align: left;
          font-size: 11px;
          color: #fff;
          background: rgba(138, 43, 226, 0.15);
          box-shadow: 0 2px 4px rgba(138, 43, 226, 0.3);
          transition: box-shadow 0.2s, transform 0.1s;
          user-select: none;
          opacity: 0.9;
          font-family: 'Courier New', monospace;
          transform-origin: center center;
        }
        .node:hover {
          box-shadow: 0 4px 8px rgba(138, 43, 226, 0.5);
          z-index: 10;
          opacity: 1;
        }
        .node-title {
          font-weight: bold;
          font-size: 12px;
          margin-bottom: 4px;
          text-align: center;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
        }
        .node-type-tag {
          display: inline-block;
          padding: 2px 8px;
          border-radius: 12px;
          font-size: 9px;
          font-weight: bold;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .node-type-tag.action {
          background: rgba(139, 0, 0, 0.8);
          color: #fff;
          border: 1px solid #8b0000;
        }
        .node-type-tag.group {
          background: rgba(138, 43, 226, 0.8);
          color: #fff;
          border: 1px solid #8a2be2;
        }
        .node-always-visible {
          margin-top: 4px;
        }
        .node-details {
          display: none;
          margin-top: 4px;
        }
        .node:hover .node-details,
        .node.expanded .node-details {
          display: block;
        }
        .node-field {
          margin: 2px 0;
          line-height: 1.3;
        }
        .node-field-label {
          font-weight: 600;
          font-size: 10px;
          opacity: 0.8;
        }
        .node-field-value {
          font-size: 11px;
        }
        .node-image {
          max-width: 100%;
          height: auto;
          border-radius: 4px;
          margin-top: 4px;
        }
        .node-action-button {
          margin-top: 6px;
          padding: 4px 10px;
          border: 1px dashed #8b0000;
          border-radius: 12px;
          background: rgba(138, 43, 226, 0.3);
          color: #fff;
          font-size: 10px;
          font-weight: bold;
          cursor: pointer;
          text-align: center;
          font-family: 'Courier New', monospace;
          transition: background 0.2s, border-color 0.2s;
          width: 100%;
        }
        .node-action-button:hover {
          background: rgba(138, 43, 226, 0.5);
          border-color: #8a2be2;
        }
        .node-action-button.contact {
          border-color: #8a2be2;
        }
        .node-action-button.join {
          border-color: #8b0000;
        }
        .node-action {
          background: rgba(138, 43, 226, 0.2);
          border-color: #8b0000;
          border-style: dashed;
        }
        .node-group {
          background: rgba(138, 43, 226, 0.3);
          border-color: #8a2be2;
          border-style: dotted;
          border-width: 2px;
        }
        .edges-svg {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
          z-index: 1;
        }
        .edge {
          stroke: #8b0000;
          stroke-opacity: 0.6;
          stroke-width: 2;
          stroke-dasharray: 4,4;
        }
        .edge-organiser {
          stroke: #8a2be2;
          stroke-opacity: 0.7;
          stroke-width: 2.5;
          stroke-dasharray: 8,4;
        }
        .edge-partof {
          stroke: #8b0000;
          stroke-opacity: 0.6;
          stroke-width: 2;
          stroke-dasharray: 4,4;
        }
        .empty-state {
          text-align: center;
          padding: 40px;
          color: #8a2be2;
          font-family: 'Courier New', monospace;
        }
        .legend {
          position: absolute;
          top: 10px;
          right: 10px;
          background: rgba(0, 0, 0, 0.8);
          border: 2px dashed #8b0000;
          padding: 10px;
          border-radius: 4px;
          box-shadow: 0 2px 4px rgba(138, 43, 226, 0.3);
          z-index: 10;
          color: #fff;
          font-family: 'Courier New', monospace;
          font-size: 11px;
        }
        .legend-item {
          display: flex;
          align-items: center;
          margin: 5px 0;
        }
        .legend-color {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          margin-right: 8px;
        }
        .legend-color.action {
          border: 2px dashed #8b0000;
          background: rgba(138, 43, 226, 0.2);
        }
        .legend-color.group {
          border: 2px dotted #8a2be2;
          background: rgba(138, 43, 226, 0.3);
        }
        .legend-line {
          width: 30px;
          height: 2px;
          margin-right: 8px;
          background: #8b0000;
          border-top: 2px dashed #8b0000;
        }
        .legend-line.organiser {
          background: #8a2be2;
          border-top: 2px dashed #8a2be2;
          height: 2.5px;
        }
      </style>
      <div class="network-container" id="network-container">
        <div class="empty-state">Loading network...</div>
      </div>
      <div class="legend">
        <div class="legend-item">
          <div class="legend-color action"></div>
          <span>Actions (dashed)</span>
        </div>
        <div class="legend-item">
          <div class="legend-color group"></div>
          <span>Groups (dotted)</span>
        </div>
        <div class="legend-item">
          <div class="legend-line"></div>
          <span>Part Of (red)</span>
        </div>
        <div class="legend-item">
          <div class="legend-line organiser"></div>
          <span>Organiser (violet)</span>
        </div>
      </div>
    `;
  }

  async renderNetwork () {
    const container = this.shadowRoot.getElementById('network-container');

    if (this.actions.length === 0 && this.groups.length === 0) {
      const msg = 'No data to display. Create actions and groups to see the network!';
      container.innerHTML = `<div class="empty-state">${msg}</div>`;
      return;
    }

    // Load D3 if needed
    // eslint-disable-next-line no-undef
    if (typeof d3 === 'undefined') {
      if (!document.querySelector('script[src*="d3.v7"]')) {
        await new Promise((resolve) => {
          const script = document.createElement('script');
          script.src = 'https://d3js.org/d3.v7.min.js';
          script.onload = resolve;
          document.head.appendChild(script);
        });
      } else {
        // Wait for existing script to load
        while (typeof d3 === 'undefined') {
          // eslint-disable-next-line no-undef
          await new Promise(r => setTimeout(r, 100));
        }
      }
    }
    this.createD3Network(container);
  }

  createD3Network (container) {
    const getDimensions = () => {
      const w = container.offsetWidth || container.clientWidth || 600;
      const h = container.offsetHeight || container.clientHeight || 600;
      return { width: w, height: h };
    };

    const { width, height } = getDimensions();

    if (width === 0 || height === 0) {
      setTimeout(() => {
        this.createD3Network(container);
      }, 100);
      return;
    }

    container.innerHTML = '';

    // Create node map for quick lookup
    const nodeMap = new Map();

    // Create Node instances
    const nodes = [
      ...this.actions.map(a => {
        const node = new Node(a._id, 'action', a.name, a, width / 2, height / 2);
        nodeMap.set(a._id, node);
        return node;
      }),
      ...this.groups.map(g => {
        const node = new Node(g._id, 'group', g.name, g, width / 2, height / 2);
        nodeMap.set(g._id, node);
        return node;
      })
    ];

    // Create DOM elements for nodes
    nodes.forEach(node => {
      node.createElement(container);
    });

    // Create edges from relationships
    const edges = [];

    // Add edges from actions
    this.actions.forEach(action => {
      // Organisers (groups that organized this action)
      if (action.organisers) {
        action.organisers.forEach(org => {
          const orgId = org._id || org;
          const sourceNode = nodeMap.get(action._id);
          const targetNode = nodeMap.get(orgId);
          if (sourceNode && targetNode) {
            edges.push({
              source: sourceNode,
              target: targetNode,
              type: 'organiser'
            });
          }
        });
      }

      // PartOf (actions this action is part of)
      if (action.partOf) {
        action.partOf.forEach(parent => {
          const parentId = parent._id || parent;
          const sourceNode = nodeMap.get(action._id);
          const targetNode = nodeMap.get(parentId);
          if (sourceNode && targetNode) {
            edges.push({
              source: sourceNode,
              target: targetNode,
              type: 'partof'
            });
          }
        });
      }
    });

    // Add edges from groups (groups can belong to other groups)
    this.groups.forEach(group => {
      if (group.partOf) {
        group.partOf.forEach(parent => {
          const parentId = parent._id || parent;
          const sourceNode = nodeMap.get(group._id);
          const targetNode = nodeMap.get(parentId);
          if (sourceNode && targetNode) {
            edges.push({
              source: sourceNode,
              target: targetNode,
              type: 'partof'
            });
          }
        });
      }
    });

    // Create Network instance and start animation
    this.network = new Network(container, nodes, edges);
    this.network.start();

    // Add event listeners for button actions
    container.addEventListener('action-join', (event) => {
      this.handleActionJoin(event.detail.action);
    });

    container.addEventListener('group-contact', (event) => {
      this.handleGroupContact(event.detail.group);
    });
  }

  handleActionJoin (action) {
    // Handle join action - can be customized
    // You can navigate to action page, show modal, etc.
    window.location.href = `/vex/actions/${action._id}`;
  }

  handleGroupContact (group) {
    // Handle contact group - can be customized
    if (group.contact) {
      if (group.contact.startsWith('http')) {
        window.open(group.contact, '_blank');
      } else if (group.contact.includes('@')) {
        window.location.href = `mailto:${group.contact}`;
      } else {
        // Could show contact info in a modal or copy to clipboard
        alert(`Contact: ${group.contact}`);
      }
    } else if (group.link) {
      window.open(group.link, '_blank');
    }
  }

  disconnectedCallback () {
    if (this.network) {
      this.network.stop();
    }
  }
}

customElements.define('action-network', ActionNetwork);

