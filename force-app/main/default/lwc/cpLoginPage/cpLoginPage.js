import { LightningElement, track } from 'lwc';
import login from '@salesforce/apex/CpLoginController.login';

export default class CpLoginPage extends LightningElement {

    // ── Form values ──────────────────────────────────────
    @track username    = '';
    @track password    = '';
    @track showPassword = false;

    // ── UI state ─────────────────────────────────────────
    @track isLoading     = false;
    @track errorMessage  = '';

    // ── Field-level validation ────────────────────────────
    @track usernameError = '';
    @track passwordError = '';
    @track usernameTouched = false;
    @track passwordTouched = false;

    // ── Computed classes ──────────────────────────────────
    get usernameFieldClass() {
        return `field${this.usernameError ? ' field--error' : ''}`;
    }

    get passwordFieldClass() {
        return `field field--password${this.passwordError ? ' field--error' : ''}`;
    }

    get passwordType() {
        return this.showPassword ? 'text' : 'password';
    }

    // ── Handlers ──────────────────────────────────────────
    handleUsernameChange(event) {
        this.username = event.target.value;
        if (this.usernameTouched) this._validateUsername();
    }

    handlePasswordChange(event) {
        this.password = event.target.value;
        if (this.passwordTouched) this._validatePassword();
    }

    handleUsernameBlur() {
        this.usernameTouched = true;
        this._validateUsername();
    }

    handlePasswordBlur() {
        this.passwordTouched = true;
        this._validatePassword();
    }

    togglePassword() {
        this.showPassword = !this.showPassword;
    }

    // ── Submit ────────────────────────────────────────────
    async handleLogin() {
        this.usernameTouched = true;
        this.passwordTouched = true;
        this._validateUsername();
        this._validatePassword();

        if (this.usernameError || this.passwordError) return;

        this.isLoading    = true;
        this.errorMessage = '';

        try {
            const result = await login({
                username : this.username.trim(),
                password : this.password,
                startUrl : null
            });

            console.log('inside handle login')
            console.log(JSON.stringify(result, null, 2));
            if (result && !result.startsWith('Error')) {
                // Redirect on success
                if(window.embeddedservice_bootstrap?.userVerificationAPI) {
                    window.embeddedservice_bootstrap.userVerificationAPI.clearSession();
                }

                const iframe = document.querySelector('iframe');

                iframe.contentWindow.postMessage(
                    {
                        type: 'END_CONVERSATION',
                        context: 'logout'
                    },
                    '*'
                );
                
                window.location.href = result;
            } else {
                this.errorMessage = result || 'An unexpected error occurred. Please try again.';
            }
        } catch (error) {
            this.errorMessage = (error && error.body && error.body.message)
                ? error.body.message
                : 'Unable to sign in. Please check your connection and try again.';
        } finally {
            this.isLoading = false;
        }
    }

    // ── Private validation ────────────────────────────────
    _validateUsername() {
        if (!this.username.trim()) {
            this.usernameError = 'Email or username is required.';
        } else {
            this.usernameError = '';
        }
    }

    _validatePassword() {
        if (!this.password) {
            this.passwordError = 'Password is required.';
        } else if (this.password.length < 6) {
            this.passwordError = 'Password must be at least 6 characters.';
        } else {
            this.passwordError = '';
        }
    }

    handleEnter(event) {
        if(event.keyCode === 13){
            this.handleLogin();
        }
    }
}