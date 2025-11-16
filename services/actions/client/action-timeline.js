class ActionTimeline extends HTMLElement {
  constructor () {
    super();
    this.actions = [];
    this.attachShadow({ mode: 'open' });
    this.render();
  }

  async connectedCallback () {
    await this.loadActions();
  }

  async loadActions () {
    try {
      const response = await fetch('/vex/actions', {
        credentials: 'include'
      });
      if (response.ok) {
        this.actions = await response.json();
        this.renderTimeline();
      }
    } catch (error) {
      console.error('Error loading actions:', error);
    }
  }

  render () {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          padding: 20px;
        }
        .timeline {
          position: relative;
          max-width: 1200px;
          margin: 0 auto;
        }
        .timeline::before {
          content: '';
          position: absolute;
          left: 50%;
          top: 0;
          bottom: 0;
          width: 2px;
          background: #8b0000;
          transform: translateX(-50%);
        }
        .timeline-item {
          position: relative;
          margin-bottom: 40px;
          width: 50%;
        }
        .timeline-item:nth-child(odd) {
          left: 0;
          padding-right: 40px;
        }
        .timeline-item:nth-child(even) {
          left: 50%;
          padding-left: 40px;
        }
        .timeline-content {
          background: rgba(138, 43, 226, 0.15);
          border: 2px dashed #8b0000;
          border-radius: 8px;
          padding: 20px;
          box-shadow: 0 2px 4px rgba(138, 43, 226, 0.3);
          color: #fff;
          font-family: 'Courier New', monospace;
        }
        .timeline-date {
          font-weight: bold;
          color: #8a2be2;
          margin-bottom: 10px;
        }
        .timeline-title {
          font-size: 18px;
          font-weight: bold;
          margin-bottom: 10px;
          color: #fff;
        }
        .timeline-description {
          color: #ccc;
          margin-bottom: 10px;
        }
        .timeline-meta {
          font-size: 12px;
          color: #999;
          margin-top: 10px;
        }
        .timeline-marker {
          position: absolute;
          width: 20px;
          height: 20px;
          background: #8a2be2;
          border: 3px solid #000;
          border-radius: 50%;
          top: 20px;
          box-shadow: 0 0 8px rgba(138, 43, 226, 0.5);
        }
        .timeline-item:nth-child(odd) .timeline-marker {
          right: -10px;
        }
        .timeline-item:nth-child(even) .timeline-marker {
          left: -10px;
        }
        .empty-state {
          text-align: center;
          padding: 40px;
          color: #8a2be2;
          font-family: 'Courier New', monospace;
        }
        .action-picture {
          max-width: 100%;
          height: auto;
          border-radius: 4px;
          margin: 10px 0;
          border: 1px dashed #8b0000;
        }
      </style>
      <div class="timeline" id="timeline-container">
        <div class="empty-state">Loading actions...</div>
      </div>
    `;
  }

  renderTimeline () {
    const container = this.shadowRoot.getElementById('timeline-container');
    
    if (this.actions.length === 0) {
      container.innerHTML = '<div class="empty-state">No actions found. Create your first action!</div>';
      return;
    }

    // Sort actions by date
    const sortedActions = [...this.actions].sort((a, b) => new Date(a.date) - new Date(b.date));

    container.innerHTML = sortedActions.map(action => {
      const date = new Date(action.date);
      const organisers = action.organisers && action.organisers.length > 0
        ? action.organisers.map(o => o.name || o).join(', ')
        : 'No organisers';
      
      const location = action.places && action.places.length > 0
        ? action.places.map(p => p.properties?.displayName || 'Unknown place').join(', ')
        : 'Location not set';

      return `
        <div class="timeline-item">
          <div class="timeline-marker"></div>
          <div class="timeline-content">
            <div class="timeline-date">${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
            <div class="timeline-title">${this.escapeHtml(action.name)}</div>
            ${this.renderPictures(action)}
            ${action.description ? `<div class="timeline-description">${this.escapeHtml(action.description)}</div>` : ''}
            <div class="timeline-meta">
              <div>📍 ${this.escapeHtml(location)}</div>
              <div>👥 Organisers: ${this.escapeHtml(organisers)}</div>
              ${action.contact ? `<div>📧 ${this.escapeHtml(action.contact)}</div>` : ''}
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  renderPictures (action) {
    const pictures = action.pictures || (action.picture ? [action.picture] : []);
    if (pictures.length === 0) {
      return '';
    }
    return pictures.map(picture => 
      `<img src="${this.escapeHtml(picture)}" alt="${this.escapeHtml(action.name)}" class="action-picture">`
    ).join('');
  }

  escapeHtml (text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

customElements.define('action-timeline', ActionTimeline);

