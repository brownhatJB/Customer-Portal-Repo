/**
 * @module            : Real_Estate_Module
 * @description       : 
 * @namespace         : 
 * @author            : SREERAM.R
 * @group             : 
 * @last modified on  : 05-25-2026
 * @last modified by  : SREERAM.R
**/
import { LightningElement, track, api } from 'lwc';
import verifyOTP from '@salesforce/apex/OTPVerificationService.verifyOTP';
import generateOTP from '@salesforce/apex/OTPGenerationService.generateOTP';

export default class CpOtpModal extends LightningElement {

    @api email;
    @api mobile;
    @api portalType;
    @api otpRecordId;
    @api otpValidTill;

    @track enteredOTP = '';
    @track otpError = '';
    @track isVerifying = false;
    @track isLoading = false;
    @track showToast = false;

    // ── TIMER ─────────────────────────────────────
    @track timeLeft = 30;
    @track otpExpired = false;

    timer;

    connectedCallback() {

        console.log('### CpOtpModal Init');
        console.log('### otpValidTill (raw):', this.otpValidTill);
        console.log('### otpValidTill (parsed):', new Date(this.otpValidTill));
        console.log('### Current time:', new Date());
        if (this.otpValidTill) {

            const diff =
                Math.floor(
                    (
                        new Date(this.otpValidTill).getTime()
                        -
                        new Date().getTime()
                    ) / 1000
                );

                    console.log('### Diff in seconds:', diff);   // negative = already expired
            console.log('### timeLeft set to:', diff > 0 ? diff : 0);
            
            this.timeLeft = diff > 0 ? diff : 0;
        } else {
        console.warn('### otpValidTill is null/undefined — timer will default to 30s');
    }

        this.startTimer();
    }

    disconnectedCallback() {
        clearInterval(this.timer);
    }

    // ── TIMER START ───────────────────────────────
    startTimer() {

        clearInterval(this.timer);

        this.otpExpired = false;

        this.timer = setInterval(() => {

            if (this.timeLeft > 0) {

                this.timeLeft--;

            } else {

                clearInterval(this.timer);
                this.otpExpired = true;
            }

        }, 1000);
    }

    // ── DISPLAY TIMER ────────────────────────────
    get timerText() {

    const minutes =
        Math.floor(this.timeLeft / 60);

    const seconds =
        this.timeLeft % 60;

    return `${minutes < 10 ? '0' : ''}${minutes}:${
        seconds < 10 ? '0' : ''
    }${seconds}`;
    }

    // ── VERIFY BUTTON ────────────────────────────
    get isDisabled() {

        return this.otpExpired;
    }

    // ── OTP INPUT ────────────────────────────────
    handleOtpChange(event) {

        // prevent editing after timer expiry
        if (this.otpExpired) {
            return;
        }

        this.enteredOTP =
            event.target.value
                .replace(/\D/g, '')
                .slice(0, 6);

        // Sync cleaned value back to UI
        event.target.value =
            this.enteredOTP;
    }

    // ── VERIFY ───────────────────────────────────
    async handleVerify() {

        this.otpError = '';

        if (!this.enteredOTP) {

            this.otpError =
                'Please enter OTP.';

            return;
        }

        this.isVerifying = true;

        try {

            const result =
                await verifyOTP({

                    emailId: this.email || '',
                    mobileNumber: this.mobile || '',

                    enteredOTP: this.enteredOTP,

                    otpGeneratedAgainst: 'Email And Mobile',

                    verificationCallFrom:
                        this.portalType || 'Customer Portal'
                });

            if (result.isSuccess) {

                // SUCCESS EVENT
                this.dispatchEvent(
                    new CustomEvent(
                        'verified'
                    )
                );

            } else {

                this.otpError =
                    result.errorMessage;
            }

        } catch (error) {

            this.otpError =
                error.body?.message
                ||
                'OTP verification failed.';
        }

        this.isVerifying = false;
    }

    // ── CLOSE ────────────────────────────────────
    handleClose() {

        this.dispatchEvent(
            new CustomEvent('close')
        );
    }

    // ── RESEND OTP ───────────────────────────────
    async handleResendOtp() {

        try {

            this.isLoading = true;

            this.otpError = '';

            // Clear old OTP
            this.enteredOTP = '';

            // Reset expiry state
            this.otpExpired = false;

            // Call Apex OTP generation
const result = await generateOTP({
    requestJson: JSON.stringify({
        emailId:              this.email,
        mobileNumber:         this.mobile,
        otpGeneratedAgainst:  'Email And Mobile',
        verificationCallFrom: this.portalType || 'Customer Portal'
    })
});

            if (result.isSuccess) {

                this.showToast = true;

                setTimeout(() => {
                    this.showToast = false;
                }, 1500);

                // Get latest valid till from backend
                this.otpValidTill = result.validTill;

                const diff =
                    Math.floor(
                        (
                            new Date(this.otpValidTill).getTime()
                            -
                            new Date().getTime()
                        ) / 1000
                    );

                this.timeLeft = diff > 0 ? diff : 0;

                // Restart timer UI
                this.startTimer();

            } else {

                this.otpError =
                    result.errorMessage
                    ||
                    'Failed to resend OTP.';
            }

        } catch (error) {

            console.error(
                'Resend OTP Error',
                error
            );

            this.otpError =
                error.body?.message
                ||
                'Unable to resend OTP.';
        }

        this.isLoading = false;
    }
}