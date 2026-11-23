import { LightningElement } from 'lwc';
import sendEOIOtp from '@salesforce/apex/CpEoiPortalController.sendEOIOtp';
import verifyEOIOtp from '@salesforce/apex/CpEoiPortalController.verifyEOIOtp';
import checkExistingContact from '@salesforce/apex/CpEoiPortalController.checkExistingContact';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

export default class CpEoiGuestLogin extends LightningElement {

    email = '';
    phone = '';
    otp = '';

    isLoading = false;

    error;
    otpError;

    showOtpModal = false;
    isVerified = false;

    otpTimer;
    remainingSeconds = 0;

    get isVerifyDisabled() {
        return this.otp.length !== 6 || this.isOtpExpired;
    }

    get isOtpExpired() {
        return this.remainingSeconds <= 0;
    }

    get formattedOtpTimer() {
        const minutes = Math.floor(this.remainingSeconds / 60);
        const seconds = this.remainingSeconds % 60;

        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }

    handleEmailChange(event) {
        this.email = event.target.value;
    }

    handlePhoneChange(event) {
        this.phone = event.target.value;
    }

    handleContinue() {
        this.error = undefined;
        this.otpError = undefined;

        if (!this.email || !this.phone) {
            this.error = 'Email and phone number are required.';
            return;
        }

        this.isLoading = true;

        checkExistingContact({
            email: this.email
        })
        .then(exists => {

            if (exists) {
                this.error = 'A user with these details already exists. Please log in using your portal credentials.';
                    this.isLoading = false;
                    return;
            }

            return sendEOIOtp({
                email: this.email,
                phone: this.phone
            })
            .then(result => {
                this.remainingSeconds = Number(result);
                this.showOtpModal = true;
                this.clearOtpCells();
                this.startOtpTimer();
            });
        })
        .catch(error => {
            this.error =
                error?.body?.message ||
                'Unable to process the request.';
        })
        .finally(() => {
            this.isLoading = false;
        });
    }

    handleOtpKeyDown(event) {
        const index = Number(event.target.dataset.index);
        const inputs = this.template.querySelectorAll('.otp-cell');

        if (
            event.key === 'Backspace' &&
            !event.target.value &&
            index > 0
        ) {
            inputs[index - 1].focus();
        }
    }

    handleOtpPaste(event) {
        event.preventDefault();

        const pastedData = event.clipboardData
            .getData('text')
            .replace(/\D/g, '')
            .slice(0, 6);

        const inputs = this.template.querySelectorAll('.otp-cell');

        pastedData.split('').forEach((value, index) => {
            if (inputs[index]) {
                inputs[index].value = value;
            }
        });

        this.updateOtp();

        const nextIndex = Math.min(pastedData.length, 5);

        if (inputs[nextIndex]) {
            inputs[nextIndex].focus();
        }
    }

    updateOtp() {
        const inputs = this.template.querySelectorAll('.otp-cell');

        this.otp = [...inputs]
            .map(input => input.value)
            .join('');
    }

    handleVerifyOtp() {
        this.otpError = undefined;

        if (this.isOtpExpired) {
            this.otpError =
                'OTP has expired. Please request a new OTP.';
            return;
        }

        if (this.otp.length !== 6) {
            this.otpError =
                'Please enter a valid 6-digit OTP.';
            return;
        }

        verifyEOIOtp({
            email: this.email,
            phone: this.phone,
            otp: this.otp
        })
        .then(result => {

            if (result.isSuccess) {

                this.stopOtpTimer();

                // Toggle state to hide form and render verified screen
                this.isVerified = true;

                setTimeout(() => {
                    this.showOtpModal = false;
                    this.isVerified = false;

                    this.dispatchEvent(
                        new CustomEvent('verified', {
                            detail: {
                                email: this.email,
                                phone: this.phone,
                                signedToken: result.signedToken
                            }
                        })
                    );
                }, 1700);

            } else {
                this.otpError =
                    result.errorMessage ||
                    'Invalid OTP. Please try again.';
            }
        })
        .catch(error => {
            this.otpError =
                error?.body?.message ||
                'Unable to verify OTP.';
        });
    }

    handleResendOtp() {
        this.otpError = undefined;

        this.stopOtpTimer();

        this.remainingSeconds = 0;

        this.clearOtpCells();

        this.handleContinue();
    }

    handleCloseOtp() {
        this.showOtpModal = false;
        this.isVerified = false;
        this.otpError = undefined;
        this.clearOtpCells();
        this.stopOtpTimer();
        this.remainingSeconds = 0;
    }

    clearOtpCells() {
        this.otp = '';

        this.template
            .querySelectorAll('.otp-cell')
            .forEach(input => {
                input.value = '';
            });
    }

    startOtpTimer() {
        this.stopOtpTimer();

        if (this.remainingSeconds <= 0) {
            return;
        }

        this.otpTimer = setInterval(() => {
            this.updateOtpTimer();
        }, 1000);
    }

    updateOtpTimer() {
        if (this.remainingSeconds <= 1) {
            this.remainingSeconds = 0;
            this.stopOtpTimer();

            this.otpError =
                'OTP has expired. Please request a new OTP.';

            return;
        }

        this.remainingSeconds--;
    }

    stopOtpTimer() {
        if (this.otpTimer) {
            clearInterval(this.otpTimer);
            this.otpTimer = undefined;
        }
    }

    disconnectedCallback() {
        this.stopOtpTimer();
    }
}