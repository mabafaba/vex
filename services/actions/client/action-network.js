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
    this.isDragging = false;
    this.dragOffsetX = 0;
    this.dragOffsetY = 0;
    this.dragStartX = 0;
    this.dragStartY = 0;
    this.hasMoved = false; // Track if mouse moved during mousedown to distinguish click from drag
    this.weight = 1 + Math.random() * 2; // Random weight between 1 and 3
    this.isRoot = false; // Whether this is a root node
    this.anchorX = null; // Anchor point X (null if not root)
    this.anchorY = null; // Anchor point Y (null if not root)
    this.parked = false; // Whether this node is parked (excluded from simulation)
  }

  formatDate (dateString) {
    if (!dateString) {
      return '';
    }
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }
  applyGravity (gravity) {
    this.applyForce(0, gravity * this.weight);
  }

  createElement (container) {
    // eslint-disable-next-line no-undef
    const selection = d3.select(container)
      .append('div')
      .attr('class', `node node-${this.type}`)
      .attr('data-node-id', this.id)
      .style('position', 'absolute')
      .style('transform', `translate(${this.x}px, ${this.y}px)`);

    // Add title with type tag
    const titleDiv = selection.append('div')
      .attr('class', 'node-title');

    titleDiv.append('span')
      .text(this.label);

    titleDiv.append('span')
      .attr('class', `node-type-tag ${this.type}`)
      .text(this.type);

    // Create content container (shown when not minimized)
    const contentContainer = selection.append('div')
      .attr('class', 'node-content');

    // Add fields based on type
    if (this.type === 'action') {
      this.addActionFields(contentContainer);
    } else if (this.type === 'group') {
      this.addGroupFields(contentContainer);
    }

    // Add drag handlers
    selection.on('mousedown', (event) => {
      event.stopPropagation();
      this.startDrag(event);
    });

    // Add click handler for highlighting (only if not dragged)
    selection.on('click', (event) => {
      event.stopPropagation();
      // Only handle highlighting if we didn't drag
      if (!this.hasMoved && this.element && this.element.parentElement && this.element.parentElement._network) {
        const network = this.element.parentElement._network;
        const currentlySelected = network.selectedNodeId;

        // If clicking the same node, deselect it
        if (currentlySelected === this.id) {
          network.setSelectedNode(null);
        } else {
          // Otherwise, select this node (works for both regular and connected nodes)
          network.setSelectedNode(this.id);
        }
      }
      this.hasMoved = false;
    });

    // Add hover handlers to bring node to front
    selection.on('mouseenter', () => {
      if (this.element) {
        this.element.style.zIndex = '2000';
      }
    });

    selection.on('mouseleave', () => {
      if (this.element) {
        // Reset z-index unless node is selected or connected
        const isSelected = this.element.classList.contains('node-selected');
        const isConnected = this.element.classList.contains('node-connected');
        if (!isSelected && !isConnected) {
          this.element.style.zIndex = '';
        }
      }
    });

    this.element = selection.node();
    const rect = this.element.getBoundingClientRect();
    this.width = rect.width || 120;
    this.height = rect.height || 40;
  }

  startDrag (event) {
    if (!this.element) {
      return;
    }

    this.isDragging = true;
    this.hasMoved = false;
    const rect = this.element.getBoundingClientRect();

    // Calculate offset from mouse to node top-left corner
    this.dragOffsetX = event.clientX - rect.left;
    this.dragOffsetY = event.clientY - rect.top;

    // Store initial position
    this.dragStartX = event.clientX;
    this.dragStartY = event.clientY;

    // Add dragging class for styling
    if (this.element) {
      this.element.classList.add('dragging');
    }

    // Store reference to this node for global handlers
    if (this.element.parentElement) {
      this.element.parentElement._draggedNode = this;
    }
  }

  updateDrag (clientX, clientY) {
    if (!this.isDragging || !this.element) {
      return;
    }

    const containerRect = this.element.parentElement.getBoundingClientRect();

    // Calculate new position
    let newX = clientX - containerRect.left - this.dragOffsetX;
    let newY = clientY - containerRect.top - this.dragOffsetY;

    // Constrain to bounds
    const { width, height } = this.getContainerDimensions();
    newX = Math.max(0, Math.min(newX, width - this.width));
    newY = Math.max(0, Math.min(newY, height - this.height));

    // Update position
    this.x = newX;
    this.y = newY;
    this.vx = 0; // Reset velocity when dragging
    this.vy = 0;

    // Render immediately for smooth dragging
    const time = Date.now() / 1000;
    this.render(time);

    // Check if mouse has moved significantly
    const moveDistance = Math.sqrt(
      Math.pow(clientX - this.dragStartX, 2) + Math.pow(clientY - this.dragStartY, 2)
    );
    if (moveDistance > 5) {
      this.hasMoved = true;
    }
  }

  endDrag () {
    if (this.isDragging) {
      this.isDragging = false;
      if (this.element) {
        this.element.classList.remove('dragging');
      }
      if (this.element && this.element.parentElement) {
        this.element.parentElement._draggedNode = null;
      }
    }
  }

  getContainerDimensions () {
    if (!this.element || !this.element.parentElement) {
      return { width: 600, height: 600 };
    }
    const container = this.element.parentElement;
    return {
      width: container.offsetWidth || container.clientWidth || 600,
      height: container.offsetHeight || container.clientHeight || 600
    };
  }

  addActionFields (container) {
    const data = this.data;

    // Store first image URL for use as circle background
    if (data.pictures && data.pictures.length > 0 && data.pictures[0]) {
      this.imageUrl = data.pictures[0];
    }

    if (data.date) {
      this.addField(container, null, this.formatDate(data.date));
    }

    if (data.pictures && data.pictures.length > 0) {
      data.pictures.forEach(pictureUrl => {
        if (pictureUrl) {
          container.append('img')
            .attr('class', 'node-image')
            .attr('src', pictureUrl)
            .attr('alt', 'Action picture');
        }
      });
    }

    container.append('button')
      .attr('class', 'node-action-button join')
      .text('Join')
      .on('mousedown', (event) => {
        event.stopPropagation();
      })
      .on('click', (event) => {
        event.stopPropagation();
        this.handleJoin(data);
      });

    if (data.description) {
      this.addField(container, null, data.description);
    }

    if (data.contact) {
      this.addField(container, null, data.contact);
    }

    if (data.organisers && data.organisers.length > 0) {
      const orgCount = Array.isArray(data.organisers) ? data.organisers.length : 0;
      this.addField(container, null, `${orgCount} group(s)`);
    }

    if (data.partOf && data.partOf.length > 0) {
      const partOfCount = Array.isArray(data.partOf) ? data.partOf.length : 0;
      this.addField(container, null, `${partOfCount} action(s)`);
    }

    if (data.createdAt) {
      this.addField(container, null, this.formatDate(data.createdAt));
    }
  }

  addGroupFields (container) {
    const data = this.data;

    // Store first image URL for use as circle background (if groups have images)
    if (data.pictures && data.pictures.length > 0 && data.pictures[0]) {
      this.imageUrl = data.pictures[0];
    }

    container.append('button')
      .attr('class', 'node-action-button contact')
      .text('Contact')
      .on('mousedown', (event) => {
        event.stopPropagation();
      })
      .on('click', (event) => {
        event.stopPropagation();
        this.handleContact(data);
      });

    if (data.description) {
      this.addField(container, null, data.description);
    }

    if (data.link) {
      this.addField(container, null, data.link);
    }

    if (data.contact) {
      this.addField(container, null, data.contact);
    }

    if (data.partOf && data.partOf.length > 0) {
      const partOfCount = Array.isArray(data.partOf) ? data.partOf.length : 0;
      this.addField(container, null, `${partOfCount} group(s)`);
    }

    if (data.createdAt) {
      this.addField(container, null, this.formatDate(data.createdAt));
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
    // Heavier nodes accelerate slower (force divided by weight)
    this.ax += fx / this.weight;
    this.ay += fy / this.weight;
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

  constrainToBoundsX (width) {
    // Only constrain X bounds, allow Y to extend for scrolling
    if (this.x < 0) {
      this.x = 0;
      this.vx *= -0.5;
    } else if (this.x > width - this.width) {
      this.x = width - this.width;
      this.vx *= -0.5;
    }

    // Only prevent nodes from going above the top
    if (this.y < 0) {
      this.y = 0;
      this.vy *= -0.5;
    }
    // Allow nodes to extend below the visible area for scrolling
  }

  render (time = 0) {
    if (this.element) {
      // Animated swing motion (handmade hanging effect)
      const swing = Math.sin(time * this.swingSpeed + this.swingPhase) * this.swingAmplitude;
      const currentTilt = this.baseTilt + swing;
      // Use transform for both translation and rotation (GPU-accelerated)
      this.element.style.transform = `translate(${this.x}px, ${this.y}px) rotate(${currentTilt}deg)`;
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

  park () {
    this.parked = true;
    if (this.element) {
      this.element.classList.add('node-parked');
      this.element.style.display = 'none';
    }
  }

  unpark () {
    this.parked = false;
    if (this.element) {
      this.element.classList.remove('node-parked');
      this.element.style.display = '';
    }
  }
}

class Network {
  constructor (container, nodes, edges) {
    this.container = container;
    this.nodes = nodes;
    this.edges = edges;
    this.centerAttractionStrength = 0.0;
    this.collisionRepulsionStrength = 10; // Strong repulsion force for overlapping nodes
    this.collisionPadding = 30;
    this.collisionDetectionEnabled = true; // Flag to enable/disable collision detection
    this.edgeAttractionStrength = 0.01;
    this.unconnectedRepulsionStrength = 0.01;
    this.idealEdgeLength = 150;
    this.maxSpeed = 2;
    this.damping = 0.9;
    this.gravity = 0.0;
    this.windStrength = 0.0001; // Base wind strength
    this.windDirection = 0; // Wind direction in radians
    this.windTime = 0; // Time counter for wind fluctuation
    this.animationId = null;
    this.timeOffset = 0; // Track time offset for animations after pre-calculation
    this.selectedNodeId = null; // Track which node is currently selected/clicked
    this.buildConnectionMap();
    this.createEdgesSVG();
  }

  buildConnectionMap () {
    // Build a map of connected nodes for quick lookup
    this.connections = new Map();
    this.nodes.forEach(node => {
      this.connections.set(node.id, new Set());
    });

    // Build edge length map: key is "sourceId-targetId" or "targetId-sourceId" (undirected)
    this.edgeLengths = new Map();
    const baseLength = this.idealEdgeLength;

    // First, build connections map and calculate node degrees
    this.edges.forEach(edge => {
      // Skip anchor edges (self-referential)
      if (edge.isAnchor) {
        return;
      }

      const sourceId = edge.source.id;
      const targetId = edge.target.id;
      this.connections.get(sourceId).add(targetId);
      this.connections.get(targetId).add(sourceId);
    });

    // Calculate and store node degrees
    this.nodes.forEach(node => {
      const degree = this.connections.get(node.id)?.size || 0;
      node.degree = degree;
    });

    // Group edges by both source and target nodes to calculate edge order from both perspectives
    const edgesByNode = new Map();
    this.edges.forEach(edge => {
      if (edge.isAnchor) {
        return;
      }
      const sourceId = edge.source.id;
      const targetId = edge.target.id;

      // Group by source
      if (!edgesByNode.has(sourceId)) {
        edgesByNode.set(sourceId, []);
      }
      edgesByNode.get(sourceId).push({ edge, direction: 'source' });

      // Group by target (for reverse direction)
      if (!edgesByNode.has(targetId)) {
        edgesByNode.set(targetId, []);
      }
      edgesByNode.get(targetId).push({ edge, direction: 'target' });
    });

    // Calculate edge order from each node's perspective
    const edgeOrderFromSource = new Map();
    const edgeOrderFromTarget = new Map();

    edgesByNode.forEach((edgeInfos) => {
      // Sort edges by connected node ID for consistent ordering
      edgeInfos.sort((a, b) => {
        const idA = a.direction === 'source' ? a.edge.target.id : a.edge.source.id;
        const idB = b.direction === 'source' ? b.edge.target.id : b.edge.source.id;
        return idA < idB ? -1 : idA > idB ? 1 : 0;
      });

      // Assign order indices: first edge = 1, second = 2, third = 3, etc.
      edgeInfos.forEach((edgeInfo, index) => {
        const order = index + 1; // 1, 2, 3, etc.
        const sourceId = edgeInfo.edge.source.id;
        const targetId = edgeInfo.edge.target.id;

        if (edgeInfo.direction === 'source') {
          const key = `${sourceId}-${targetId}`;
          edgeOrderFromSource.set(key, order);
        } else {
          const key = `${targetId}-${sourceId}`;
          edgeOrderFromTarget.set(key, order);
        }
      });
    });

    // Assign lengths to edges considering both source and target perspectives
    // Use the maximum order from both perspectives to determine length
    this.edges.forEach(edge => {
      if (edge.isAnchor) {
        return;
      }
      const sourceId = edge.source.id;
      const targetId = edge.target.id;
      const key1 = `${sourceId}-${targetId}`;
      const key2 = `${targetId}-${sourceId}`;

      const orderFromSource = edgeOrderFromSource.get(key1) || 1;
      const orderFromTarget = edgeOrderFromTarget.get(key2) || 1;

      // Use the maximum order from both perspectives
      const maxOrder = Math.max(orderFromSource, orderFromTarget);
      const length = baseLength * maxOrder; // 1x, 2x, 3x, etc.

      // Store length for both directions (undirected edge)
      this.edgeLengths.set(key1, length);
      this.edgeLengths.set(key2, length);
    });

    // Also store length on edge objects for reference
    this.edges.forEach(edge => {
      if (edge.isAnchor) {
        return;
      }
      const sourceId = edge.source.id;
      const targetId = edge.target.id;
      const key = `${sourceId}-${targetId}`;
      edge.length = this.edgeLengths.get(key) || baseLength;
    });

    // Log edge lengths for debugging
    // eslint-disable-next-line no-console
    this.edges.forEach(edge => {
      if (!edge.isAnchor && edge.length) {
        const sourceName = edge.source.data?.name || edge.source.id;
        const targetName = edge.target.data?.name || edge.target.id;
        const sourceId = edge.source.id;
        const targetId = edge.target.id;
        const key1 = `${sourceId}-${targetId}`;
        const key2 = `${targetId}-${sourceId}`;
        const orderFromSource = edgeOrderFromSource.get(key1) || 1;
        const orderFromTarget = edgeOrderFromTarget.get(key2) || 1;
        const multiplier = (edge.length / baseLength).toFixed(1);
      }
    });
  }

  getEdgeLength (sourceId, targetId) {
    const key = `${sourceId}-${targetId}`;
    return this.edgeLengths.get(key) || this.idealEdgeLength;
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
    // Attract to connected nodes (like a rope/thread)
    const connectedIds = this.connections.get(node.id);
    const nodeCenter = node.getCenter();

    // Apply attraction to regular connected nodes
    if (connectedIds) {
      connectedIds.forEach(connectedId => {
        const connectedNode = this.nodes.find(n => n.id === connectedId);
        if (!connectedNode || !connectedNode.element || connectedNode.parked) {
          return;
        }

        // Get the assigned length for this edge
        const maxRopeLength = this.getEdgeLength(node.id, connectedId);

        const otherCenter = connectedNode.getCenter();
        const dx = otherCenter.x - nodeCenter.x;
        const dy = otherCenter.y - nodeCenter.y;
        const distance = this.dist(nodeCenter.x, nodeCenter.y, otherCenter.x, otherCenter.y);

        if (distance > 0) {
          // Rope behavior: strong force only when stretched beyond max length
          if (distance > maxRopeLength) {
            // Rope is taut - apply strong force to pull nodes together
            const stretch = distance - maxRopeLength;
            const strength = this.edgeAttractionStrength * stretch;
            node.applyForce((dx / distance) * strength, (dy / distance) * strength);
          } else {
            // Rope is slack - apply minimal or no force
            // Optional: very weak force to gently bring them closer if desired
            const slack = maxRopeLength - distance;
            const minStrength = this.edgeAttractionStrength * 0.01; // 1% of normal strength when slack
            const strength = minStrength * slack * 0.1; // Very weak attraction when slack
            node.applyForce((dx / distance) * strength, (dy / distance) * strength);
          }
        }
      });
    }

    // Apply attraction to anchor point for root nodes
    // Anchor edges use the base ideal edge length
    if (node.isRoot && node.anchorX !== null && node.anchorY !== null) {
      const maxRopeLength = this.idealEdgeLength; // Anchor edges use base length
      const dx = node.anchorX - nodeCenter.x;
      const dy = node.anchorY - nodeCenter.y;
      const distance = this.dist(nodeCenter.x, nodeCenter.y, node.anchorX, node.anchorY);

      if (distance > 0) {
        // Rope behavior: strong force only when stretched beyond max length
        if (distance > maxRopeLength) {
          // Rope is taut - apply strong force to pull node towards anchor
          const stretch = distance - maxRopeLength;
          const strength = this.edgeAttractionStrength * stretch;
          node.applyForce((dx / distance) * strength, (dy / distance) * strength);
        } else {
          // Rope is slack - apply minimal or no force
          const slack = maxRopeLength - distance;
          const minStrength = this.edgeAttractionStrength * 0.01;
          const strength = minStrength * slack * 0.1;
          node.applyForce((dx / distance) * strength, (dy / distance) * strength);
        }
      }
    }
  }

  applyUnconnectedRepulsion (node) {
    // Repel from unconnected nodes
    const nodeCenter = node.getCenter();
    const connectedIds = this.connections.get(node.id) || new Set();

    this.nodes.forEach(otherNode => {
      if (node.id === otherNode.id || !otherNode.element || otherNode.parked || connectedIds.has(otherNode.id)) {
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
    // Skip collision detection if disabled
    if (!this.collisionDetectionEnabled) {
      return;
    }

    const nodeCenter = node.getCenter();
    const nodeHalf = node.getHalfDimensions();

    this.nodes.forEach(otherNode => {
      if (node.id === otherNode.id || !otherNode.element || otherNode.parked) {
        return;
      }

      const otherCenter = otherNode.getCenter();
      const otherHalf = otherNode.getHalfDimensions();

      const dx = nodeCenter.x - otherCenter.x;
      const dy = nodeCenter.y - otherCenter.y;
      const distance = this.dist(nodeCenter.x, nodeCenter.y, otherCenter.x, otherCenter.y);

      const minDistX = nodeHalf.width + otherHalf.width + this.collisionPadding;
      const minDistY = nodeHalf.height + otherHalf.height + this.collisionPadding;

      // Check if nodes are overlapping
      if (Math.abs(dx) < minDistX && Math.abs(dy) < minDistY) {
        // Calculate overlap amounts
        const overlapX = minDistX - Math.abs(dx);
        const overlapY = minDistY - Math.abs(dy);

        // Use the maximum overlap to determine repulsion strength
        const overlap = Math.max(overlapX, overlapY);

        if (overlap > 0 && distance > 0) {
          // Calculate strong repulsion force proportional to overlap
          // Force increases with overlap amount
          const forceStrength = this.collisionRepulsionStrength * overlap * overlap; // Quadratic for stronger response

          // Normalize direction vector
          const dirX = dx / distance;
          const dirY = dy / distance;

          // cancel out y direction
          //dirY = 0;
          // Apply repulsion force to this node (away from other node)
          // If other node is being dragged, apply stronger force to this node
          if (otherNode.isDragging) {
            node.applyForce(dirX * forceStrength * 2, dirY * forceStrength * 2);
          } else if (node.isDragging) {
            // If this node is being dragged, apply force to other node
            otherNode.applyForce(-dirX * forceStrength * 2, -dirY * forceStrength * 2);
          } else {
            // Apply forces to both nodes (equal and opposite)
            node.applyForce(dirX * forceStrength, dirY * forceStrength);
            otherNode.applyForce(-dirX * forceStrength, -dirY * forceStrength);
          }
        } else if (overlap > 0 && distance === 0) {
          // Nodes are exactly on top of each other, apply random repulsion
          const angle = Math.random() * Math.PI * 2;
          const forceStrength = this.collisionRepulsionStrength * overlap * overlap;
          const dirX = Math.cos(angle);
          const dirY = Math.sin(angle);

          if (otherNode.isDragging) {
            node.applyForce(dirX * forceStrength * 2, dirY * forceStrength * 2);
          } else if (node.isDragging) {
            otherNode.applyForce(-dirX * forceStrength * 2, -dirY * forceStrength * 2);
          } else {
            node.applyForce(dirX * forceStrength, dirY * forceStrength);
            otherNode.applyForce(-dirX * forceStrength, -dirY * forceStrength);
          }
        }
      }
    });
  }

  update (skipRender = false) {
    const { width, height } = this.getDimensions();
    const centerX = width / 2;
    const centerY = height / 2;
    const time = (Date.now() / 1000) + this.timeOffset; // Time in seconds for animation

    // Update fluctuating wind
    this.windTime += 0.01; // Increment wind time
    // Wind direction fluctuates smoothly
    this.windDirection = Math.sin(this.windTime * 0.5) * Math.PI * 2;
    // Wind strength fluctuates between 0.5x and 1.5x base strength
    const windStrengthMultiplier = 0.5 + (Math.sin(this.windTime * 0.3) + 1) * 0.5;
    const currentWindStrength = this.windStrength * windStrengthMultiplier;
    const windX = Math.cos(this.windDirection) * currentWindStrength;
    const windY = Math.sin(this.windDirection) * currentWindStrength;

    // Update SVG size if container resized
    if (this.edgesSvg) {
      this.edgesSvg.attr('width', width).attr('height', height);
    }

    this.nodes.forEach(node => {
      if (!node.element) {
        return;
      }

      // Skip parked nodes (not simulated or rendered)
      if (node.parked) {
        return;
      }

      // Skip physics for nodes being dragged
      if (node.isDragging) {
        if (!skipRender) {
          node.render(time);
        }
        return;
      }

      node.resetAcceleration();
      this.applyCenterAttraction(node, centerX, centerY);
      this.applyEdgeAttraction(node);
      this.applyUnconnectedRepulsion(node);
      node.applyGravity(this.gravity);
      // Apply wind force (affects all nodes)
      node.applyForce(windX, windY);
      // Handle collisions before position update (apply strong repulsion forces)
      this.handleCollisions(node);
      node.updateVelocity(this.damping, this.maxSpeed);
      node.updatePosition();

      // Only constrain X bounds, allow Y to extend for scrolling
      node.constrainToBoundsX(width);
      // Update anchor point position for root nodes (X follows node, Y is fixed)
      this.updateAnchorPoint(node, width);
      if (!skipRender) {
        node.render(time);
      }
    });

    // Update container height based on node positions for scrolling
    this.updateContainerHeight();

    // Update edge positions
    if (!skipRender) {
      this.updateEdges();
      // Update highlighting to ensure edge classes are applied
      this.updateHighlighting();
    }
  }

  precalculateTicks (numTicks = 1000) {
    // eslint-disable-next-line no-console
    console.log(`Pre-calculating ${numTicks} ticks...`);
    const startTime = performance.now();

    // Disable collision detection during pre-calculation for better performance
    const wasCollisionEnabled = this.collisionDetectionEnabled;
    this.collisionDetectionEnabled = false;

    for (let i = 0; i < numTicks; i++) {
      this.update(true); // Skip rendering during pre-calculation
    }

    // Re-enable collision detection after pre-calculation
    this.collisionDetectionEnabled = wasCollisionEnabled;

    const endTime = performance.now();
    // eslint-disable-next-line no-console
    console.log(`Pre-calculation complete in ${(endTime - startTime).toFixed(2)}ms`);
    // Update time offset so visual animations continue smoothly
    // Approximate: 1000 ticks at ~60fps = ~16.67 seconds
    this.timeOffset = numTicks * 0.016;
  }

  updateContainerHeight () {
    if (!this.container) {
      return;
    }

    let maxY = 600; // Minimum height
    this.nodes.forEach(node => {
      if (node.element && !node.parked) {
        const nodeBottom = node.y + node.height;
        if (nodeBottom > maxY) {
          maxY = nodeBottom;
        }
      }
    });

    // Add padding at bottom
    maxY += 100;
    // Update container height if needed
    const currentHeight = parseInt(this.container.style.height) || 600;
    if (maxY > currentHeight) {
      this.container.style.height = `${maxY}px`;
    }
  }

  updateAnchorPoint (node, width) {
    if (node.isRoot && node.anchorX !== null && node.anchorY !== null) {
      // Anchor Y is fixed at top of canvas
      node.anchorY = 20; // Fixed Y position at top (with some padding)
      // Anchor X follows the node's X position (with some smoothing/damping)
      const nodeCenter = node.getCenter();
      const targetX = nodeCenter.x;
      // Smoothly move anchor X towards node X (damping factor for smooth following)
      node.anchorX = node.anchorX * 0.7 + targetX * 0.3;
      // Constrain anchor X to canvas bounds
      node.anchorX = Math.max(0, Math.min(node.anchorX, width));
    }
  }

  setSelectedNode (nodeId) {
    this.selectedNodeId = nodeId;
    this.updateHighlighting();
  }

  parkNode (nodeId) {
    const node = this.nodes.find(n => n.id === nodeId);
    if (node) {
      node.park();
    }
  }

  unparkNode (nodeId) {
    const node = this.nodes.find(n => n.id === nodeId);
    if (node) {
      node.unpark();
    }
  }

  parkAll () {
    this.nodes.forEach(node => node.park());
  }

  unparkConnected (nodeId) {
    // Unpark the selected node
    this.unparkNode(nodeId);

    // Unpark all nodes connected to it (bidirectional)
    const connectedIds = this.connections.get(nodeId);
    if (connectedIds) {
      connectedIds.forEach(connectedId => {
        this.unparkNode(connectedId);
      });
    }
  }

  updateHighlighting () {
    // Park/unpark nodes based on selection
    if (!this.selectedNodeId) {
      // When nothing is selected, unpark all nodes
      this.nodes.forEach(node => {
        if (node.parked) {
          node.unpark();
        }
      });
    } else {
      // When something is selected, park all nodes first
      this.parkAll();
      // Then unpark only the selected node and its connections
      this.unparkConnected(this.selectedNodeId);
    }

    // Update node highlighting
    this.nodes.forEach(node => {
      if (!node.element) {
        return;
      }

      // Skip parked nodes for highlighting updates
      if (node.parked) {
        return;
      }

      // When nothing is selected, minimize all nodes
      if (!this.selectedNodeId) {
        node.element.classList.add('node-minimized');
        node.element.classList.remove('node-selected');
        node.element.classList.remove('node-connected');
        this.updateMinimizedSize(node);
        return;
      }

      // When something is selected, use the existing logic
      const isSelected = node.id === this.selectedNodeId;
      const isConnected = this.areConnected(node.id, this.selectedNodeId);
      const shouldMinimize = !isSelected && !isConnected;

      if (isSelected) {
        node.element.classList.add('node-selected');
        node.element.classList.remove('node-minimized');
        node.element.style.width = '';
        node.element.style.height = '';
        node.element.style.minWidth = '';
        node.element.style.maxWidth = '';
        node.element.style.backgroundImage = '';
      } else {
        node.element.classList.remove('node-selected');
      }

      if (isConnected) {
        node.element.classList.add('node-connected');
        node.element.classList.remove('node-minimized');
        node.element.style.width = '';
        node.element.style.height = '';
        node.element.style.minWidth = '';
        node.element.style.maxWidth = '';
        node.element.style.backgroundImage = '';
      } else {
        node.element.classList.remove('node-connected');
      }

      if (shouldMinimize) {
        node.element.classList.add('node-minimized');
        this.updateMinimizedSize(node);
      } else {
        node.element.classList.remove('node-minimized');
        node.element.style.width = '';
        node.element.style.height = '';
        node.element.style.minWidth = '';
        node.element.style.maxWidth = '';
        node.element.style.backgroundImage = '';
      }
    });

    // Update edge highlighting
    if (this.edgeSelection) {
      this.edgeSelection.classed('edge-highlighted', (edge) => {
        if (!this.selectedNodeId || edge.isAnchor) {
          return false;
        }
        return edge.source.id === this.selectedNodeId || edge.target.id === this.selectedNodeId;
      });
    }
  }

  updateMinimizedSize (node) {
    if (!node.element) {
      return;
    }

    let size;

    // If node has a photo background, set size to 100px
    if (node.imageUrl) {
      size = 100;
    } else {
      // Calculate size based on logarithmic scale of degree
      // Base size: 20px, max size: 100px
      // Using log scale: size = base + log(degree + 1) * scale
      const baseSize = 50;
      const maxSize = 120;
      const degree = node.degree || 0;

      // Logarithmic scale: log(degree + 1) to avoid log(0)
      // Scale factor to map to size range
      const logDegree = Math.log(degree + 1);
      const maxLog = Math.log(100); // Assume max degree around 100 for scaling
      const scale = (maxSize - baseSize) / maxLog;
      const calculatedSize = baseSize + (logDegree * scale);

      // Clamp to min/max
      size = Math.max(baseSize, Math.min(maxSize, calculatedSize));
    }

    node.element.style.width = `${size}px`;
    node.element.style.height = `${size}px`;
    node.element.style.minWidth = `${size}px`;
    node.element.style.maxWidth = `${size}px`;

    // Set background image if available
    if (node.imageUrl) {
      node.element.style.backgroundImage = `url(${node.imageUrl})`;
      node.element.style.backgroundSize = 'cover';
      node.element.style.backgroundPosition = 'center';
      node.element.style.backgroundRepeat = 'no-repeat';
    } else {
      node.element.style.backgroundImage = '';
    }
  }

  updateEdges () {
    if (!this.edgeSelection) {
      return;
    }

    const containerRect = this.container.getBoundingClientRect();

    this.edgeSelection.each(function (edge) {
      // Handle anchor edges (from anchor point to root node)
      if (edge.isAnchor && edge.source === edge.target) {
        const node = edge.source;
        if (!node.element || !node.isRoot || node.anchorX === null || node.anchorY === null || node.parked) {
          // eslint-disable-next-line no-undef
          d3.select(this).style('display', 'none');
          return;
        }
        // eslint-disable-next-line no-undef
        d3.select(this).style('display', '');

        const nodeRect = node.element.getBoundingClientRect();
        const x1 = node.anchorX; // Anchor point X (relative to container)
        const y1 = node.anchorY; // Anchor point Y (relative to container)
        const x2 = nodeRect.left - containerRect.left + nodeRect.width / 2;
        const y2 = nodeRect.top - containerRect.top + nodeRect.height / 2;

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
        return;
      }

      // Handle regular edges
      const sourceNode = edge.source;
      const targetNode = edge.target;

      if (!sourceNode.element || !targetNode.element) {
        // eslint-disable-next-line no-undef
        d3.select(this).style('display', 'none');
        return;
      }

      // Hide edges connected to parked nodes
      if (sourceNode.parked || targetNode.parked) {
        // eslint-disable-next-line no-undef
        d3.select(this).style('display', 'none');
        return;
      }

      // eslint-disable-next-line no-undef
      d3.select(this).style('display', '');

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

  start (precalculate = 1000) {
    if (precalculate > 0) {
      this.precalculateTicks(precalculate);
    }

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
    this.places = [];
    this.attachShadow({ mode: 'open' });
    this.render();
  }

  async connectedCallback () {
    await this.loadData();
    this.renderNetwork();
  }

  async loadData () {
    try {
      const [actionsRes, groupsRes, placesRes] = await Promise.all([
        fetch('/vex/actions', { credentials: 'include' }),
        fetch('/vex/groups', { credentials: 'include' }),
        fetch('/vex/places', { credentials: 'include' })
      ]);

      if (actionsRes.ok) {
        this.actions = await actionsRes.json();
      }
      if (groupsRes.ok) {
        this.groups = await groupsRes.json();
      }
      if (placesRes.ok) {
        this.places = await placesRes.json();
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
          min-height: 600px;
          height: 600px;
          border: 2px dashed #8b0000;
          border-radius: 8px;
          position: relative;
          overflow-x: hidden;
          overflow-y: auto;
          background: #000;
        }
        .node {
          position: absolute;
          cursor: move;
          border: 2px solid #8b0000;
          border-radius: 4px;
          padding: 8px 12px;
          min-width: 120px;
          max-width: 250px;
          user-select: none;
          color: #fff;
          transition: width 0.3s ease, height 0.3s ease, min-width 0.3s ease, max-width 0.3s ease,
                      border-radius 0.3s ease, padding 0.3s ease, background-image 0.3s ease;
        }
        .node.dragging {
          cursor: grabbing;
          z-index: 1000;
          opacity: 0.9;
        }
        .node:hover {
          cursor: grab;
        }
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
          z-index: 1000;
          opacity: 1 !important;
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
          transition: opacity 0.2s ease;
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
        .node-type-tag.place {
          background: rgba(0, 128, 0, 0.8);
          color: #fff;
          border: 1px solid #008000;
        }
        .node-place {
          background: rgba(0, 128, 0, 0.8);
          border-color: #008000;
          border-style: solid;
        }
        .node-content {
          margin-top: 4px;
          transition: opacity 0.2s ease;
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
          background: rgba(234, 24, 164, 0.8);
          border-color: #8b0000;
          border-style: dashed;
        }
        .node-group {
          background: rgba(83, 6, 237, 0.8);
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
          stroke:rgb(255, 84, 84);
          stroke-opacity: 0.55;
          stroke-width: 2;
          stroke-dasharray: 4,4;
          transition: stroke-opacity 0.2s, stroke-width 0.2s;
        }
        .edge-organiser {
          stroke:rgb(179, 98, 255);
          stroke-opacity: 0.55;
          stroke-width: 1.5;
          stroke-dasharray: 8,4;
        }
        .edge-partof {
          stroke:rgb(255, 88, 88);
          stroke-opacity: 0.55;
          stroke-width: 2;
          stroke-dasharray: 4,4;
        }
        .edge-anchor {
          stroke:rgb(255, 112, 112);
          stroke-opacity: 0.55;
          stroke-width: 2;
          stroke-dasharray: 4,4;
        }
        .edge-place {
          stroke:rgb(0, 200, 0);
          stroke-opacity: 0.6;
          stroke-width: 2;
          stroke-dasharray: 6,3;
        }
        .edge-parent {
          stroke:rgb(0, 150, 0);
          stroke-opacity: 0.5;
          stroke-width: 1.5;
          stroke-dasharray: 3,3;
        }
        .edge-highlighted {
          stroke-opacity: 1 !important;
          stroke-width: 6 !important;
          filter: drop-shadow(0 0 4px currentColor);
        }
        .edge-highlighted.edge-organiser {
          stroke-width: 4 !important;
        }
        .node-selected {
          box-shadow: 0 0 20px rgba(255, 255, 255, 0.8) !important;
          border-color: #fff !important;
          z-index: 1001 !important;
          transform: scale(1.05);
          transition: transform 0.2s, box-shadow 0.2s, border-color 0.2s;
        }
        .node-connected {
          border-color:rgba(255, 255, 255, 0.48) 133, 132) !important;
          opacity: 0.8 !important;
          z-index: 1000 !important;
        }
        .node-minimized {
          border-radius: 50% !important;
          padding: 0 !important;
          overflow: hidden !important;
        }
        .node-minimized .node-title,
        .node-minimized .node-content {
          opacity: 0 !important;
          pointer-events: none !important;
          height: 0 !important;
          overflow: hidden !important;
        }
        .node-parked {
          display: none !important;
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
        .legend-color.place {
          border: 2px solid #008000;
          background: rgba(0, 128, 0, 0.3);
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
        <div class="empty-state">weaving ones and zeroes...</div>
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
        <div class="legend-item">
          <div class="legend-color place"></div>
          <span>Places (green)</span>
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
      }),
      ...this.places.map(p => {
        const displayName = p.properties?.displayName || 'Unknown Place';
        const node = new Node(p._id, 'place', displayName, p, width / 2, height / 2);
        nodeMap.set(p._id, node);
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

    // Add edges from actions to places
    this.actions.forEach(action => {
      if (action.places) {
        action.places.forEach(place => {
          const placeId = place._id || place;
          const sourceNode = nodeMap.get(action._id);
          const targetNode = nodeMap.get(placeId);
          if (sourceNode && targetNode) {
            edges.push({
              source: sourceNode,
              target: targetNode,
              type: 'place'
            });
          }
        });
      }
    });

    // Add edges from groups to places
    this.groups.forEach(group => {
      if (group.places) {
        group.places.forEach(place => {
          const placeId = place._id || place;
          const sourceNode = nodeMap.get(group._id);
          const targetNode = nodeMap.get(placeId);
          if (sourceNode && targetNode) {
            edges.push({
              source: sourceNode,
              target: targetNode,
              type: 'place'
            });
          }
        });
      }
    });

    // Add edges from places to their parent places (show all parents in chain)
    // Helper function to recursively add parent edges
    const addParentEdges = (place, visited = new Set()) => {
      if (visited.has(place._id)) {
        return; // Avoid cycles
      }
      visited.add(place._id);

      if (place.parents && place.parents.length > 0) {
        place.parents.forEach(parent => {
          const parentId = parent._id || parent;
          const sourceNode = nodeMap.get(place._id);
          const targetNode = nodeMap.get(parentId);
          if (sourceNode && targetNode) {
            edges.push({
              source: sourceNode,
              target: targetNode,
              type: 'parent'
            });
            // Recursively add edges for the parent's parents
            const parentPlace = this.places.find(p => (p._id || p) === parentId);
            if (parentPlace) {
              addParentEdges(parentPlace, visited);
            }
          }
        });
      }
    };

    this.places.forEach(place => {
      addParentEdges(place);
    });

    // Identify root nodes and set up anchor points
    // Root nodes: groups with no partOf, actions with no organisers and no partOf
    const rootNodes = [];
    nodes.forEach(node => {
      const isGroupRoot = node.type === 'group' && (!node.data.partOf || node.data.partOf.length === 0);
      const isActionRoot = node.type === 'action' &&
        (!node.data.organisers || node.data.organisers.length === 0) &&
        (!node.data.partOf || node.data.partOf.length === 0);

      if (isGroupRoot || isActionRoot) {
        node.isRoot = true;
        const nodeCenter = node.getCenter();
        node.anchorX = nodeCenter.x; // Initialize anchor X at node's X position
        node.anchorY = 20; // Fixed Y at top of canvas
        rootNodes.push(node);
      }
    });

    // Add anchor edges for root nodes (edge from anchor point to node)
    rootNodes.forEach(rootNode => {
      edges.push({
        source: rootNode, // The anchor point is part of the node
        target: rootNode, // Self-reference to indicate anchor edge
        type: 'anchor',
        isAnchor: true // Flag to identify anchor edges
      });
    });

    // Create Network instance and start animation
    this.network = new Network(container, nodes, edges);
    // Store network reference on container for node hover handlers
    container._network = this.network;
    // Initialize all nodes as minimized (collapsed circle view)
    this.network.updateHighlighting();
    this.network.start(15000);

    // Add event listeners for button actions
    container.addEventListener('action-join', (event) => {
      this.handleActionJoin(event.detail.action);
    });

    container.addEventListener('group-contact', (event) => {
      this.handleGroupContact(event.detail.group);
    });

    // Add global drag handlers
    this.handleMouseMove = (event) => {
      if (container._draggedNode) {
        container._draggedNode.updateDrag(event.clientX, event.clientY);
      }
    };

    this.handleMouseUp = () => {
      if (container._draggedNode) {
        container._draggedNode.endDrag();
      }
    };

    // Use document to handle mouse events even if cursor leaves container
    document.addEventListener('mousemove', this.handleMouseMove);
    document.addEventListener('mouseup', this.handleMouseUp);
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

    // Remove global drag handlers
    if (this.handleMouseMove) {
      document.removeEventListener('mousemove', this.handleMouseMove);
    }
    if (this.handleMouseUp) {
      document.removeEventListener('mouseup', this.handleMouseUp);
    }
  }
}

customElements.define('action-network', ActionNetwork);

