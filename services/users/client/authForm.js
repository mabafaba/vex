class AuthenticationForm extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        

        const translator = (translations) => {
            return (key) => {
            const lang = document.documentElement.lang || 'en';
    
            if(!translations[lang] || !translations[lang][key]) {
                console.warn(`No translation found for key: ${key} in language: ${lang}`);
                return key;
            }
            return translations[lang][key];
            }
        }

        this.t = translator(
            {
                en: { login: "Login", register: "Register", 'alreadyRegistered': "Already registered? Login", 'dontHaveAccount': "Don't have an account? Register" },
                es: { login: "Iniciar sesión", register: "Registrarse", 'alreadyRegistered': "¿Ya registrado? Iniciar sesión", 'dontHaveAccount': "¿No tienes una cuenta? Regístrate" },
                fr: { login: "Connexion", register: "S'inscrire", 'alreadyRegistered': "Déjà enregistré? Connexion", 'dontHaveAccount': "Vous n'avez pas de compte? S'inscrire" },
                de: { login: "Anmeldung", register: "Registrieren", 'alreadyRegistered': "Bereits registriert? Anmeldung", 'dontHaveAccount': "Sie haben kein Konto? Registrieren" },
                pt: { login: "Entrar", register: "Registrar", 'alreadyRegistered': "Já registrado? Entrar", 'dontHaveAccount': "Você não tem uma conta? Registre-se" },
              });

        const observer = new MutationObserver(() => {
                this.render();
            }
            );
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
    }

    static get observedAttributes() {
        return ['target-url'];
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (name === 'target-url') {
            const loginForm = this.shadowRoot.querySelector('.login-form');
            const registrationForm = this.shadowRoot.querySelector('.registration-form');
            if (loginForm) loginForm.setAttribute('target-url', newValue);
            if (registrationForm) registrationForm.setAttribute('target-url', newValue);
        }

    }

    connectedCallback() {
        this.render();
        
        // observe global language changes and re-render with a custom observer
    }

    render() {
        
        this.shadowRoot.innerHTML = `
            <style>
                .hidden {
                    display: none;
                }

                .container {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                }

                a {
                    margin-top: 10px;
                    cursor: pointer;
                    text-decoration: underline;
                }
            </style>
            <div class="container">
                <login-form class="login-form hidden"></login-form>
                <registration-form class="registration-form"></registration-form>
                <a id="switch-to-register" class="hidden">${this.t("dontHaveAccount")}</a>
                <a id="switch-to-login">${this.t("alreadyRegistered")}</a>
            </div>
        `;
        this.addEventListeners();

    }

    addEventListeners() {
        console.log('adding event listeners to authentication form');
        const loginForm = this.shadowRoot.querySelector('.login-form');
        const registrationForm = this.shadowRoot.querySelector('.registration-form');
        const toggleLink = this.shadowRoot.querySelector('#toggle-link');

        loginForm.setAttribute('login-endpoint', this.getAttribute('login-endpoint'));
        loginForm.setAttribute('target-url', this.getAttribute('target-url'));
        registrationForm.setAttribute('register-endpoint', this.getAttribute('register-endpoint'));
        registrationForm.setAttribute('target-url', this.getAttribute('target-url'));
        registrationForm.setAttribute('login-endpoint', this.getAttribute('login-endpoint'));
        // toggleLink.addEventListener('click', () => {
        //     if (loginForm.classList.contains('hidden')) {
        //         loginForm.classList.remove('hidden');
        //         registrationForm.classList.add('hidden');
        //         toggleLink.textContent = this.t('dontHaveAccount');
        //     } else {
        //         loginForm.classList.add('hidden');
        //         registrationForm.classList.remove('hidden');
        //         toggleLink.textContent = this.t('alreadyRegistered');
        //     }
        // });

        const switchToLogin = this.shadowRoot.querySelector('#switch-to-login');
        switchToLogin.addEventListener('click', () => {
            loginForm.classList.remove('hidden');
            registrationForm.classList.add('hidden');
            switchToLogin.classList.add('hidden');
            switchToRegister.classList.remove('hidden');
        });

        const switchToRegister = this.shadowRoot.querySelector('#switch-to-register');
        switchToRegister.addEventListener('click', () => {
            loginForm.classList.add('hidden');
            registrationForm.classList.remove('hidden');
            switchToLogin.classList.remove('hidden');
            switchToRegister.classList.add('hidden');
        });
    }
}

customElements.define('authentication-form', AuthenticationForm);





class LoginForm extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });



        const translator = (translations) => {
            return (key) => {
            const lang = document.documentElement.lang || 'en';
    
            if(!translations[lang] || !translations[lang][key]) {
                console.warn(`No translation found for key: ${key} in language: ${lang}`);
                return key;
            }
            return translations[lang][key];
            }
        }

        this.t = translator(
            {
                en: { username: "Username", password: "Password", login: "Login" },
                es: { username: "Usuario", password: "Contraseña", login: "Iniciar sesión"},
                fr: { username: "Nom d'utilisateur", password: "Mot de passe", login: "Connexion"},
                de: { username: "Benutzername", password: "Passwort", login: "Anmeldung"},
                pt: { username: "Nome de usuário", password: "Senha", login: "Entrar"},
              });


        const observer = new MutationObserver(() => {this.render();});
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });

        this.render();
        
    }

    render() {
        this.shadowRoot.innerHTML = `
        <style>
            :host form {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
            }

            :host input {
                margin: 5px;
            }

            :host a {
                margin-top: 10px;
            }
        </style>
        <form>
            <h1>${this.t('login')}</h1>
            <div class="error" style="background-color: red;"></div><br>
            <label for="username">${this.t('username')}</label><br>
            <input type="text" id="username" required/><br>
            <label for="password">${this.t('password')}</label><br>
            <input type="password" id="password" required><br>
            <input type="button" id="loginButton" value="${this.t('login')}"><br>
        </form>
        
    `;

    this.addEventListeners();
    }

    connectedCallback() {

        this.render();
    }

    addEventListeners() {

        console.log('adding event listeners to login form');
        this.form = this.shadowRoot.querySelector('form');
        this.username = this.shadowRoot.querySelector('#username');
        this.password = this.shadowRoot.querySelector('#password');
        this.display = this.shadowRoot.querySelector('.error');

        this.loginButton = this.shadowRoot.querySelector('#loginButton');


        this.loginButton.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            const targeturl = this.getAttribute('target-url') || '/';
            console.log('targeturl', targeturl);
            this.loginEndpoint = this.getAttribute('login-endpoint') || './user/login';

            this.display.textContent = '';
    
            try {
                const res = await fetch(this.loginEndpoint, {
                    method: 'POST',
                    body: JSON.stringify({ username: this.username.value, password: this.password.value }),
                    headers: { 'Content-Type': 'application/json' }
                });
                const data = await res.json();
                if (res.status === 400 || res.status === 401) {
                    return this.display.textContent = `${data.message}. ${data.error ? data.error : ''}`; 
                }
                // Dispatch a custom event to notify successful login
                const loginSuccessEvent = new CustomEvent('login-success', {
                    bubbles: true,
                    composed: true,
                    detail: { user: data }
                });
                this.dispatchEvent(loginSuccessEvent);
                // location.assign(targeturl);
            } catch (err) {
                console.log(err.message);
            }
        });
    }
}

customElements.define('login-form', LoginForm);




class RegistrationForm extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });


        const translator = (translations) => {
            return (key) => {
            const lang = document.documentElement.lang || 'en';
    
            if(!translations[lang] || !translations[lang][key]) {
                console.warn(`No translation found for key: ${key} in language: ${lang}`);
                return key;
            }
            return translations[lang][key];
            }
        }

        this.t = translator(
            {
                en: { username: "Username", password: "Password", register: "Register", 'confirm password': "Confirm password", "password mismatch": "Passwords do not match"},
                es: { username: "Usuario", password: "Contraseña", register: "Registrarse", 'confirm password': "Confirmar contraseña", "password mismatch": "Las contraseñas no coinciden"},
                fr: { username: "Nom d'utilisateur", password: "Mot de passe", register: "S'inscrire", 'confirm password': "Confirmez le mot de passe", "password mismatch": "Les mots de passe ne correspondent pas"},
                de: { username: "Benutzername", password: "Passwort", register: "Registrieren", 'confirm password': "Bestätigen Sie das Passwort", "password mismatch": "Passwörter stimmen nicht überein"},
                pt: { username: "Nome de usuário", password: "Senha", register: "Registrar", 'confirm password': "Confirme a senha", "password mismatch": "As senhas não coincidem"},
              });


        const observer = new MutationObserver(() => {this.render();});
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
    
    }

    connectedCallback() {
        this.render();
    }

    render() {
        this.shadowRoot.innerHTML = `
            <style>

                form {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                }

                input {
                    margin: 5px;
                }

                a {
                    margin-top: 10px;
                }

            </style>
            
            <form>
            <h1>${this.t('register')}</h1>
                <div class="error" style="background-color: red;"></div><br>
                <label for="username">${this.t('username')}</label><br>
                <input type="text" id="username" required/><br>
                <label for="password">${this.t('password')}</label><br>
                <input type="password" id="password" required><br>
                <label for="confirm-password">${this.t('confirm password')}</label><br>
                <input type="password" id="confirm-password" required><br>
                <input type="button" id='registrationButton' value="${this.t('register')}"><br>
            </form>
        `;
        this.addEventListeners();
    }

    addEventListeners() {
        console.log('adding event listeners to registration form');
        const form = this.shadowRoot.querySelector('form');
        const username = this.shadowRoot.querySelector('#username');
        const password = this.shadowRoot.querySelector('#password');
        const display = this.shadowRoot.querySelector('.error');
        const loginLink = this.shadowRoot.querySelector('#login-link');
        const registrationButton = this.shadowRoot.querySelector('#registrationButton');
        console.log('registrationButton', registrationButton);
        // remove any event listeners from button

        registrationButton.removeEventListener('click', () => {
            console.log('removing event listener');
        }
        );

        registrationButton.addEventListener('click', async (e) => {
            console.log('submitting registration form');

            // stop if password and confirm password don't match
            if (password.value !== this.shadowRoot.querySelector('#confirm-password').value) {
                display.textContent = this.t('password mismatch');
                return;
            }
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            display.textContent = '';
            try {
                const res = await fetch(this.getAttribute('register-endpoint'), {
                    method: 'POST',
                    body: JSON.stringify({ username: username.value, password: password.value }),
                    headers: { 'Content-Type': 'application/json' }
                });
                const data = await res.json();

                if (res.status === 200 || res.status === 201) {
                    console.log('registration successful. logging in...');
                    

                    const res = await fetch(this.getAttribute('login-endpoint'), {
                        method: 'POST',
                        body: JSON.stringify({ username: username.value, password: password.value }),
                        headers: { 'Content-Type': 'application/json' }
                    });
                    const data = await res.json();
                    
                    if (res.status === 400 || res.status === 401) {
                        display.textContent = `${data.message}. ${data.error ? data.error : ''}`;
                    }
 
                    const targeturl = this.getAttribute('target-url') || '/';
                    console.log('logged in', data);
                    console.log('redirecting to', targeturl);
                    // Dispatch a custom event to notify successful login after registration
                    const loginSuccessEvent = new CustomEvent('login-success', {
                        bubbles: true,
                        composed: true,
                        detail: { user: data }
                    });
                    this.dispatchEvent(loginSuccessEvent);
                    // location.assign(targeturl);

                } else if (res.status === 400 || res.status === 401) {
                    display.textContent = `${data.message}. ${data.error ? data.error : ''}`;
                }
            } catch (err) {
                console.log(err.message);
            }
        });
    }
}

customElements.define('registration-form', RegistrationForm);