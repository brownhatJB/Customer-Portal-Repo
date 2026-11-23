/**
 * @module            : Real_Estate_Module
 * @description       : 
 * @namespace         : 
 * @author            : SREERAM.R
 * @group             : 
 * @last modified on  : 05-25-2026
 * @last modified by  : SREERAM.R
**/
import { LightningElement, track } from 'lwc';
import signup from '@salesforce/apex/CpLoginController.signup';
import generateOTP from '@salesforce/apex/OTPGenerationService.generateOTP';

export default class CpSignupPage extends LightningElement {

    // ── Field values ──────────────────────────────────────
    @track firstName       = '';
    @track lastName        = '';
    @track email           = '';
    @track mobile          = '';
    @track password        = '';
    @track confirmPassword = '';
    @track showPassword    = false;
    @track otpRecordId;
    @track otpValidTill;


     // ── OTP STATE ─────────────────────────────────────────
    @track showOtpModal = false;
    @track otpVerified = false;


    // ── UI state ──────────────────────────────────────────
    @track isLoading      = false;
    @track errorMessage   = '';
    @track successMessage = '';

    // ── Touched flags ─────────────────────────────────────
    @track firstNameTouched       = false;
    @track lastNameTouched        = false;
    @track emailTouched           = false;
    @track mobileTouched          = false;
    @track passwordTouched        = false;
    @track confirmPasswordTouched = false;

    // ── Field errors ──────────────────────────────────────
    @track firstNameError       = '';
    @track lastNameError        = '';
    @track emailError           = '';
    @track mobileError        = '';
    @track passwordError        = '';
    @track confirmPasswordError = '';


    // ── FORM LOCK AFTER OTP ───────────────────────────────
    get isFormLocked() {
        return this.otpVerified;
    }

    // ── Computed: field classes ────────────────────────────
    get firstNameClass()       { return `field${this.firstNameError ? ' field--error' : ''}`; }
    get lastNameClass()        { return `field${this.lastNameError ? ' field--error' : ''}`; }
    get emailClass()           { return `field${this.emailError ? ' field--error' : ''}`; }
    get mobileClass()          { return `field${this.mobileError ? ' field--error' : ''}`; }
    get passwordClass()        { return `field${this.passwordError ? ' field--error' : ''}`; }
    get confirmPasswordClass() { return `field${this.confirmPasswordError ? ' field--error' : ''}`; }

    // ── Password visibility ────────────────────────────────
    get passwordType() {
        return this.showPassword ? 'text' : 'password';
    }

    // ── Password strength ──────────────────────────────────
    get passwordStrength() {
        const p = this.password;
        if (!p) return 0;
        let score = 0;
        if (p.length >= 8)          score++;
        if (/[A-Z]/.test(p))        score++;
        if (/[0-9]/.test(p))        score++;
        if (/[^A-Za-z0-9]/.test(p)) score++;
        return score;
    }

    get strengthFill() {
        if (!this.password) return 'strength-fill';
        const s = this.passwordStrength;
        if (s <= 1) return 'strength-fill strength-fill--weak';
        if (s <= 2) return 'strength-fill strength-fill--fair';
        return 'strength-fill strength-fill--strong';
    }

    get strengthLabel() {
        if (!this.password) return '';
        const s = this.passwordStrength;
        if (s <= 1) return 'Weak';
        if (s <= 2) return 'Fair';
        return 'Strong';
    }

    get strengthLabelClass() {
        const s = this.passwordStrength;
        if (s <= 1) return 'strength-text strength-text--weak';
        if (s <= 2) return 'strength-text strength-text--fair';
        return 'strength-text strength-text--strong';
    }

    // ── Handlers ──────────────────────────────────────────
    handleFirstNameChange(e)       { this.firstName       = e.target.value; if (this.firstNameTouched)       this._validateFirstName(); }
    handleLastNameChange(e)        { this.lastName        = e.target.value; if (this.lastNameTouched)        this._validateLastName(); }
    handleEmailChange(e)           { this.email           = e.target.value; if (this.emailTouched)           this._validateEmail(); }
    handlemobileChange(e)          { this.mobile         = e.target.value; if (this.mobileTouched)           this._validateMobile(); }
    handlePasswordChange(e)        { this.password        = e.target.value; if (this.passwordTouched)        this._validatePassword();
                                     if (this.confirmPasswordTouched) this._validateConfirmPassword(); }
    handleConfirmPasswordChange(e) { this.confirmPassword = e.target.value; if (this.confirmPasswordTouched) this._validateConfirmPassword(); }

    handleFirstNameBlur()       { this.firstNameTouched       = true; this._validateFirstName(); }
    handleLastNameBlur()        { this.lastNameTouched        = true; this._validateLastName(); }
    handleEmailBlur()           { this.emailTouched           = true; this._validateEmail(); }
    handleMobileBlur()          { this.mobileTouched           = true; this._validateMobile(); }
    handlePasswordBlur()        { this.passwordTouched        = true; this._validatePassword(); }
    handleConfirmPasswordBlur() { this.confirmPasswordTouched = true; this._validateConfirmPassword(); }

    togglePassword() { this.showPassword = !this.showPassword; }

    // ── Submit ────────────────────────────────────────────
async handleSignup() {

    this.firstNameTouched = true;
    this.lastNameTouched = true;
    this.emailTouched = true;
    this.mobileTouched = true;
    this.passwordTouched = true;
    this.confirmPasswordTouched = true;

    this._validateFirstName();
    this._validateLastName();
    this._validateEmail();
    this._validateMobile();
    this._validatePassword();
    this._validateConfirmPassword();

    if (
        this.firstNameError ||
        this.lastNameError ||
        this.emailError ||
        this.mobileError ||
        this.passwordError ||
        this.confirmPasswordError
    ) {
        return;
    }

    if (!this.otpVerified) {

        try {

            const request = {
                emailId:              this.email.trim(),
                mobileNumber:         this.mobile.trim(),
                otpGeneratedAgainst:  'Email And Mobile',
                verificationCallFrom: 'Customer Portal'
            };

            console.log('OTP Request:', JSON.stringify(request));

            // ✅ CHANGE THIS LINE
            const response = await generateOTP({
                requestJson: JSON.stringify(request)
            });

            console.log('OTP Response:', JSON.stringify(response));

            if (response.isSuccess) {
                this.otpRecordId  = response.otpRecordId;
                this.otpValidTill = response.validTill;
                this.showOtpModal = true;
            } else {
                this.errorMessage = response.errorMessage || 'OTP generation failed.';
            }

        } catch (error) {

            console.error('OTP Error:', error);
            this.errorMessage = error?.body?.message || 'OTP generation failed';
        }

        return;
    }

    await this.createAccount();
}


    // ── OTP VERIFIED HANDLER ─────────────────────────────
    handleOtpVerified() {

        this.otpVerified = true;
        this.showOtpModal = false;

        // this.successMessage = 'OTP verified successfully.';
    }


    // ── OTP CLOSE ─────────────────────────────────────────
    handleOtpClose() {
        this.showOtpModal = false;
    }

    // ── FINAL ACCOUNT CREATION ────────────────────────────
    async createAccount() {

        this.isLoading = true;
        this.errorMessage = '';

        try {

            const result = await signup({
                firstName: this.firstName.trim(),
                lastName: this.lastName.trim(),
                email: this.email.trim(),
                mobile: this.mobile.trim(),
                username: this.email.trim(),
                password: this.password,
                startUrl: null
            });

            if (result && !result.startsWith('Error')) {

                this.successMessage =
                    'Account created! Redirecting…';

                const iframe = document.querySelector('iframe');

                iframe.contentWindow.postMessage(
                    {
                        type: 'END_CONVERSATION',
                        context: 'logout'
                    },
                    '*'
                );
                
                setTimeout(() => {
                    window.location.href = result;
                }, 1200);

            } else {

                this.errorMessage =
                    result || 'Something went wrong.';
            }

        } catch (error) {

            this.errorMessage =
                error?.body?.message || 'Signup failed';

        } finally {

            this.isLoading = false;
        }
    }

    // ── Validation ────────────────────────────────────────
    _validateFirstName() {
        this.firstNameError = this.firstName.trim() ? '' : 'First name is required.';
    }

    _validateLastName() {
        this.lastNameError = this.lastName.trim() ? '' : 'Last name is required.';
    }

    _validateEmail() {
        const v = this.email.trim();
        if (!v) {
            this.emailError = 'Email address is required.';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) {
            this.emailError = 'Please enter a valid email address.';
        } else {
            this.emailError = '';
        }
    }

   _validateMobile() {
    const v = this.mobile.trim();

    if (!v) {
        this.mobileError = 'Mobile number is required.';
        return;
    }
    if (!/^(?:\+91|0)?[6-9]\d{9}$/.test(v)) {
        this.mobileError = 'Please enter a valid mobile number.';
    } else {
        this.mobileError = '';
    }
}

    _validatePassword() {
        if (!this.password) {
            this.passwordError = 'Password is required.';
        } else if (this.password.length < 8) {
            this.passwordError = 'Password must be at least 8 characters.';
        } else {
            this.passwordError = '';
        }
    }

    _validateConfirmPassword() {
        if (!this.confirmPassword) {
            this.confirmPasswordError = 'Please confirm your password.';
        } else if (this.confirmPassword !== this.password) {
            this.confirmPasswordError = 'Passwords do not match.';
        } else {
            this.confirmPasswordError = '';
        }
    }
}