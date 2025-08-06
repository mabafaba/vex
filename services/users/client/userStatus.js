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
      en: { login: 'Login', logout: 'Logout' },
      es: { login: 'Iniciar sesión', logout: 'Cerrar sesión' },
      fr: { login: 'Connexion', logout: 'Déconnexion' },
      de: { login: 'Anmeldung', logout: 'Abmelden' },
      pt: { login: 'Entrar', logout: 'Sair' }
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

    // Auto-expand dialog if not logged in
    if (!this.isLoggedIn) {
      this.showLoginForm();
    }
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
        // Initialize global state if it doesn't exist
        if (typeof window.state === 'undefined') {
          window.state = {};
        }
        window.state.userid = this.user.id;
        window.state.username = this.user.name;
        this.isLoggedIn = true;
        // Dispatch login success event when user data is fetched successfully
        this.dispatchEvent(new CustomEvent('login-success', {
          bubbles: true,
          composed: true,
          detail: { user: this.user }
        }));
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
    authPopup.classList.add('open');
  }

  hideLoginForm () {
    const authPopup = this.shadowRoot.querySelector('.auth-popup');
    authPopup.classList.remove('open');
  }

  addEventListeners () {
    // Add event listener for auth button
    const authButton = this.shadowRoot.querySelector('.auth-button');
    authButton?.addEventListener('click', () => {
      if (this.isLoggedIn) {
        this.handleLogout();
      } else {
        this.showLoginForm();
      }
    });

    // Add event listener for close button
    this.shadowRoot
      .querySelector('.auth-popup-close')
      ?.addEventListener('click', () => this.hideLoginForm());

    // Listen for successful login events from the auth form
    const authForm = this.shadowRoot.querySelector('authentication-form');
    authForm?.addEventListener('login-success', async (e) => {
      this.hideLoginForm();
      await this.fetchUserData();
    });
  }

  render () {
    const loginTarget = this.getAttribute('login-target') || window.location.href;
    const loginEndpoint = this.getAttribute('login-endpoint');
    const registerEndpoint = this.getAttribute('register-endpoint');

    this.shadowRoot.innerHTML = `
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css">
      <style>
        :host {
          display: inline-block;
        }
        
        .user-status {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        
        .auth-button {
          background: #634E8F;
          color: white;
          border: none;
          border-radius: 50%;
          width: 36px;
          height: 36px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background-color 0.2s;
          box-shadow: 0 2px 5px rgba(0,0,0,0.2);
        }
        
        .auth-button:hover {
          background: #7b62b3;
        }
        
        .auth-button i {
          font-size: 16px;
        }
        
        /* Auth popup styles */
        .auth-popup {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100vh;
          display: none;
          background-color: white;
          z-index: 1000;
        }
        
        .auth-popup.open {
          display: block;
        }
        
        .auth-popup-content {
          max-width: 500px;
          width: 90%;
          margin: 40px auto;
          padding: 20px;
        }
        
        .auth-popup-close {
          position: absolute;
          top: 20px;
          right: 20px;
          border: none;
          background: none;
          font-size: 24px;
          cursor: pointer;
          color: #666;
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          transition: background-color 0.2s;
        }

        .auth-popup-close:hover {
          background-color: rgba(0,0,0,0.1);
        }
      </style>
      
      <div class="user-status">
        <button class="auth-button" title="${this.isLoggedIn ? this.t('logout') : this.t('login')}">
          <i class="fas ${this.isLoggedIn ? 'fa-sign-out-alt' : 'fa-sign-in-alt'}"></i>
        </button>
      </div>
      
      <div class="auth-popup">
        <button class="auth-popup-close">×</button>
        <div class="auth-popup-content">
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
