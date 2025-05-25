class UserStatus extends HTMLElement {
  constructor () {
    super();
    this.attachShadow({ mode: 'open' });
    this.user = null;
    this.isLoggedIn = false;

    // Simple translator function
    const translator = (translations) => {
      return (key) => {
        const lang = document.documentElement.lang || 'en';

        if (!translations[lang] || !translations[lang][key]) {
          console.warn(
            `No translation found for key: ${key} in language: ${lang}`
          );
          return key;
        }
        return translations[lang][key];
      };
    };

    this.t = translator({
      en: { login: 'Login', logout: 'Logout', welcome: 'Welcome' },
      es: {
        login: 'Iniciar sesión',
        logout: 'Cerrar sesión',
        welcome: 'Bienvenido'
      },
      fr: { login: 'Connexion', logout: 'Déconnexion', welcome: 'Bienvenue' },
      de: { login: 'Anmeldung', logout: 'Abmelden', welcome: 'Willkommen' },
      pt: { login: 'Entrar', logout: 'Sair', welcome: 'Bem-vindo' }
    });

    // Observe language changes and re-render
    const observer = new MutationObserver(() => this.render());
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['lang']
    });
  }

  static get observedAttributes () {
    return [
      'me-endpoint',
      'logout-endpoint',
      'login-target',
      'login-endpoint',
      'register-endpoint'
    ];
  }

  attributeChangedCallback (name, oldValue, newValue) {
    if (oldValue !== newValue) {
      this.render();
    }
  }

  async connectedCallback () {
    await this.fetchUserData();
    this.render();
    this.addEventListeners();
  }

  async fetchUserData () {
    try {
      const meEndpoint = this.getAttribute('me-endpoint') || '/user/me';
      const response = await fetch(meEndpoint, {
        method: 'GET',
        credentials: 'include' // Include cookies for JWT authentication
      });

      if (response.status === 200) {
        this.user = await response.json();
        // set global state.user variable
        // check if 'state' object exists in document global scope

        state.userid = this.user.id;
        state.username = this.user.name;
        this.isLoggedIn = true;
      } else {
        this.user = null;
        this.isLoggedIn = false;
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
      this.user = null;
      this.isLoggedIn = false;
    }

    this.render();
  }

  async handleLogout () {
    try {
      const logoutEndpoint = this.getAttribute('logout-endpoint') || '/logout';
      // Make a fetch request instead of redirecting
      await fetch(logoutEndpoint, {
        method: 'GET',
        credentials: 'include' // Include cookies for JWT authentication
      });

      // Clear the JWT token from cookies
      document.cookie = 'jwt=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';

      // Disconnect all socket connections
      document.querySelectorAll('vex-list').forEach((vexList) => {
        if (vexList._socket) {
          vexList._socket.disconnect();
          vexList._socket = null;
        }
      });

      // Clear local state
      this.user = null;
      this.isLoggedIn = false;

      // dispatch logout event
      this.dispatchEvent(new CustomEvent('user-logout', { bubbles: true, composed: true }));
      // Update the UI
      this.render();
    } catch (error) {
      console.error('Error during logout:', error);
    }
  }

  showLoginForm () {
    const authPopup = this.shadowRoot.querySelector('.auth-popup');
    authPopup.style.display = 'flex';
  }

  hideLoginForm () {
    const authPopup = this.shadowRoot.querySelector('.auth-popup');
    authPopup.style.display = 'none';
  }

  addEventListeners () {
    // Add event listeners for login/logout buttons
    if (this.isLoggedIn) {
      this.shadowRoot
        .querySelector('#logout-button')
        ?.addEventListener('click', () => this.handleLogout());
    } else {
      this.shadowRoot
        .querySelector('#login-button')
        ?.addEventListener('click', () => this.showLoginForm());
    }

    // Add event listener for close button
    this.shadowRoot
      .querySelector('.auth-popup-close')
      ?.addEventListener('click', () => this.hideLoginForm());

    // Close popup when clicking outside
    const authPopup = this.shadowRoot.querySelector('.auth-popup');
    authPopup?.addEventListener('click', (e) => {
      if (e.target === authPopup) {
        this.hideLoginForm();
      }
    });

    // Listen for successful login events from the auth form
    const authForm = this.shadowRoot.querySelector('authentication-form');
    authForm?.addEventListener('login-success', async (e) => {
      this.hideLoginForm();
      await this.fetchUserData();
    });
  }

  render () {
    const loginTarget =
      this.getAttribute('login-target') || window.location.href;
    const loginEndpoint = this.getAttribute('login-endpoint');
    const registerEndpoint = this.getAttribute('register-endpoint');

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: inline-block;
        }
        
        .user-status {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        
        button {
          padding: 6px 12px;
          border-radius: 4px;
          cursor: pointer;
          border: 1px solid #ccc;
          background-color: #f8f8f8;
        }
        
        button:hover {
          background-color: #e8e8e8;
        }
        
        .username {
          font-weight: bold;
        }
        
        /* Auth popup styles */
        .auth-popup {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          display: none;
          justify-content: center;
          align-items: center;
          z-index: 1000;
        }
        
        .auth-popup-content {
          position:absolute;
          top:0;
          right:0;
          background-color: white;
          padding: 20px;
          border-radius: 5px;
          max-width: 500px;
          width: 90%;
        }
        
        .auth-popup-close {
          float: right;
          border: none;
          background: none;
          font-size: 20px;
          cursor: pointer;
        }
      </style>
      
      <div class="user-status">
        ${
  this.isLoggedIn
    ? `<span>${this.t('welcome')}, <span class="username">${
      this.user.name || this.user.username
    }</span></span>
           <button id="logout-button">${this.t('logout')}</button>`
    : `<button id="login-button">${this.t('login')}</button>`
}
      </div>
      
      <div class="auth-popup">
        <div class="auth-popup-content">
          <button class="auth-popup-close">×</button>
          <authentication-form 
            target-url="${loginTarget}"
            ${loginEndpoint ? `login-endpoint="${loginEndpoint}"` : ''}
            ${registerEndpoint ? `register-endpoint="${registerEndpoint}"` : ''}
          ></authentication-form>
        </div>
      </div>
    `;

    this.addEventListeners();
  }
}

customElements.define('user-status', UserStatus);
