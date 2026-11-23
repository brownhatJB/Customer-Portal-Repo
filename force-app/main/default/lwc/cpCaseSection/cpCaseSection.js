import { LightningElement, track, wire } from 'lwc';
import { loadScript }              from 'lightning/platformResourceLoader';
import GSAP_LIB                    from '@salesforce/resourceUrl/gsap_lib';
import createCase                  from '@salesforce/apex/CasePortalController.createCase';
import getCustomerRecords          from '@salesforce/apex/CaseRelatedRecordsController.getCustomerRecords';

export default class CpCaseSection extends LightningElement {

    // ─── Form fields ────────────────────────────────────────────────────────
    @track subject     = '';
    @track category    = '';
    @track description = '';
    @track fileName    = '';
    @track base64Data  = '';
    @track hasFile     = false;

    // --- Related Record IDs ---
    @track offerId = '';
    @track unitSaleId = '';
    @track invoiceId = '';
    @track leadId = '';

    // ─── UI state ────────────────────────────────────────────────────────────
    @track isSubmitting  = false;
    @track submitted     = false;
    @track errorMessage  = '';
    @track isDragOver    = false;

    // ─── Validation errors ───────────────────────────────────────────────────
    @track subjectError     = '';
    @track categoryError    = '';
    @track descriptionError = '';

    // ─── Result ──────────────────────────────────────────────────────────────
    @track createdCaseId = '';

    // ─── Picklists Data ──────────────────────────────────────────────────────
    offerOptions = [];
    unitSaleOptions = [];
    invoiceOptions = [];
    leadOptions = [];

    // ─── Picklist ────────────────────────────────────────────────────────────
    categoryOptions = [
        { label: 'Inquiry',            value: 'Inquiry'            },
        { label: 'Booking',            value: 'Booking'            },
        { label: 'Offer Related',      value: 'Offer Related'      },
        { label: 'Sale Related',       value: 'Sale Related'       },
        { label: 'Billing / Payment',  value: 'Payment'            },
        { label: 'Technical Issue',    value: 'Technical Issue'    },
        { label: 'Feedback',           value: 'Feedback'           },
        { label: 'Other',              value: 'Other'              },
    ];

    // ─── GSAP flag ───────────────────────────────────────────────────────────
    _gsapReady = false;

    // ════════════════════════════════════════════════════════════════════════
    // LIFECYCLE
    // ════════════════════════════════════════════════════════════════════════

    @wire(getCustomerRecords)
    wiredRecords({ data, error }) {
    console.log('========== CUSTOMER RECORDS DEBUG ==========');

    if (data) {
        console.log('Apex response received');
        console.log('Full response:', JSON.parse(JSON.stringify(data)));

        console.log('Offers:', JSON.parse(JSON.stringify(data.offers)));
        console.log('Unit Sales:', JSON.parse(JSON.stringify(data.unitSales)));
        console.log('Invoices:', JSON.parse(JSON.stringify(data.invoices)));
        console.log('Leads:', JSON.parse(JSON.stringify(data.leads)));

        console.log('Offer count:', data.offers ? data.offers.length : 'NULL');
        console.log('Unit Sale count:', data.unitSales ? data.unitSales.length : 'NULL');
        console.log('Invoice count:', data.invoices ? data.invoices.length : 'NULL');
        console.log('Lead count:', data.leads ? data.leads.length : 'NULL');

        this.offerOptions = data.offers || [];
        this.unitSaleOptions = data.unitSales || [];
        this.invoiceOptions = data.invoices || [];
        this.leadOptions = data.leads || [];

        console.log(
            'LWC leadOptions after assignment:',
            JSON.parse(JSON.stringify(this.leadOptions))
        );

    } else if (error) {
        console.error('========== APEX ERROR ==========');
        console.error('Raw error:', error);
        console.error(
            'Serialized error:',
            JSON.parse(JSON.stringify(error))
        );

        if (error.body) {
            console.error('Error body:', error.body);
            console.error('Error message:', error.body.message);
        }
    }

    console.log('==========================================');
    }
    
    connectedCallback() {
        // Load GSAP core first, then ScrollTrigger plugin
        loadScript(this, GSAP_LIB + '/gsap.min.js')
            .then(() => loadScript(this, GSAP_LIB + '/ScrollTrigger.min.js'))
            .then(() => {
                this._gsapReady = true;
                // gsap and ScrollTrigger are now on window
                window.gsap.registerPlugin(window.ScrollTrigger);
                this._runEntranceTimeline();
                this._startOrbitalSpin();
            })
            .catch((err) => {
                // Graceful degradation — component is fully usable without animations
                console.warn('[cpCaseSection] GSAP failed to load:', err);
            });
    }

    // ════════════════════════════════════════════════════════════════════════
    // ANIMATIONS
    // ════════════════════════════════════════════════════════════════════════

    _q(selector) {
        return this.template.querySelector(selector);
    }
    _qa(selector) {
        return this.template.querySelectorAll(selector);
    }

    _runEntranceTimeline() {
        const gsap = window.gsap;
        const ST   = window.ScrollTrigger;
        const root = this._q('.ccs-root');

        const tl = gsap.timeline({
            scrollTrigger: {
                trigger : root,
                start   : 'top 65%',
                toggleActions: 'play none none reset',
            },
            defaults: { ease: 'power3.out' },
        });

        // ── Left panel ──────────────────────────────────────────────────────

        // Eyebrow badge
        tl.fromTo(
            this._q('.js-eyebrow'),
            { autoAlpha: 0, y: -14 },
            { autoAlpha: 1, y: 0, duration: 0.55 },
            0
        );

        // Eyebrow line expand
        tl.fromTo(
            this._q('.ccs-eyebrow__line'),
            { scaleX: 0 },
            { scaleX: 1, duration: 0.7, ease: 'power2.inOut', transformOrigin: 'left' },
            0.1
        );

        // Headline words slide up from clip
        tl.fromTo(
            this._qa('.js-word'),
            { yPercent: 105, skewY: 4 },
            { yPercent: 0, skewY: 0, duration: 0.75, stagger: 0.1 },
            0.2
        );

        // Body copy
        tl.fromTo(
            this._q('.js-body'),
            { autoAlpha: 0, y: 22 },
            { autoAlpha: 1, y: 0, duration: 0.6 },
            0.6
        );

        // Trust items
        tl.fromTo(
            this._qa('.js-trust-item'),
            { autoAlpha: 0, x: -18 },
            { autoAlpha: 1, x: 0, duration: 0.5, stagger: 0.1 },
            0.75
        );

        // ── Vertical rule ───────────────────────────────────────────────────

        tl.fromTo(
            this._qa('.js-rule'),
            { scaleY: 0 },
            { scaleY: 1, duration: 0.7, ease: 'power2.inOut', transformOrigin: 'top', stagger: 0.1 },
            0.15
        );

        tl.fromTo(
            this._q('.js-rule-label'),
            { autoAlpha: 0 },
            { autoAlpha: 1, duration: 0.4 },
            0.7
        );

        // ── Right panel ─────────────────────────────────────────────────────

        tl.fromTo(
            this._q('.js-form-header'),
            { autoAlpha: 0, x: 28 },
            { autoAlpha: 1, x: 0, duration: 0.65 },
            0.25
        );

        tl.fromTo(
            this._qa('.js-field'),
            { autoAlpha: 0, x: 24 },
            { autoAlpha: 1, x: 0, duration: 0.55, stagger: 0.09 },
            0.38
        );

        tl.fromTo(
            this._q('.js-submit-row'),
            { autoAlpha: 0, y: 16 },
            { autoAlpha: 1, y: 0, duration: 0.5 },
            0.88
        );
    }

    _startOrbitalSpin() {
        const orb = this._q('.js-orb');
        if (!orb) return;
        window.gsap.to(orb, {
            rotation       : 360,
            duration       : 70,
            repeat         : -1,
            ease           : 'none',
            transformOrigin: '50% 50%',
        });
    }

    // Animated underline bar on focus
    _animateBarIn(field) {
        if (!this._gsapReady) return;
        const bar = field.querySelector('.js-bar');
        if (bar) {
            window.gsap.to(bar, {
                scaleX         : 1,
                duration       : 0.38,
                ease           : 'power2.out',
                transformOrigin: 'left',
            });
        }
    }

    _animateBarOut(field, hasValue) {
        if (!this._gsapReady) return;
        const bar = field.querySelector('.js-bar');
        if (bar && !hasValue) {
            window.gsap.to(bar, {
                scaleX         : 0,
                duration       : 0.28,
                ease           : 'power2.in',
                transformOrigin: 'right',
            });
        }
    }

    _shakeInvalidFields() {
        if (!this._gsapReady) return;
        const fields = this.template.querySelectorAll('.ccs-field--invalid');
        if (!fields.length) return;
        window.gsap.timeline()
            .to(fields, { x: -7,  duration: 0.07 })
            .to(fields, { x:  7,  duration: 0.07 })
            .to(fields, { x: -5,  duration: 0.06 })
            .to(fields, { x:  5,  duration: 0.06 })
            .to(fields, { x:  0,  duration: 0.05 });
    }

    _animateSuccessIn() {
        if (!this._gsapReady) return;

        // Give LWC one tick to render the success template
        // eslint-disable-next-line @lwc/lwc/no-async-operation
        setTimeout(() => {
            const el     = this._q('.js-success');
            const circle = this._q('.js-check-circle');
            const mark   = this._q('.js-check-mark');

            if (!el) return;

            const circumference = 2 * Math.PI * 35; // r=35 → ~219.9

            window.gsap.fromTo(
                el,
                { autoAlpha: 0, scale: 0.9, y: 20 },
                { autoAlpha: 1, scale: 1,   y: 0, duration: 0.65, ease: 'back.out(1.5)' }
            );

            if (circle) {
                window.gsap.set(circle, {
                    strokeDasharray : circumference,
                    strokeDashoffset: circumference,
                });
                window.gsap.to(circle, {
                    strokeDashoffset: 0,
                    duration        : 0.85,
                    ease            : 'power2.out',
                    delay           : 0.25,
                });
            }

            if (mark) {
                window.gsap.set(mark, {
                    strokeDasharray : 60,
                    strokeDashoffset: 60,
                });
                window.gsap.to(mark, {
                    strokeDashoffset: 0,
                    duration        : 0.5,
                    ease            : 'power2.out',
                    delay           : 0.75,
                });
            }
        }, 50);
    }

    // ════════════════════════════════════════════════════════════════════════
    // DYNAMIC VISIBILITY GETTERS
    // ════════════════════════════════════════════════════════════════════════

    get isOfferRelated() { return this.category === 'Offer Related'; }
    get isUnitRelated() { return this.category === 'Sale Related' || this.category === 'Unit Enquiry'; }
    get isPaymentRelated() { return this.category === 'Payment' || this.category === 'Billing'; }
    get isBookingRelated() { return this.category === 'Booking'; }

    // ════════════════════════════════════════════════════════════════════════
    // FIELD HANDLERS
    // ════════════════════════════════════════════════════════════════════════

    handleSubject(e)     { this.subject     = e.target.value; this.subjectError     = ''; }
    handleDescription(e) { this.description = e.target.value; this.descriptionError = ''; }

    handleCategory(e)    { 
        this.category    = e.target.value; 
        this.categoryError    = ''; 

        // Debugging the visibility getters
        console.log('--- CATEGORY SELECTION DEBUG ---');
        console.log('User Selected Category:', this.category);
        console.log('isOfferRelated:', this.isOfferRelated);
        console.log('isUnitRelated:', this.isUnitRelated);
        console.log('isPaymentRelated:', this.isPaymentRelated);
        console.log('isBookingRelated:', this.isBookingRelated);
        console.log('Available Offer Options in memory:', JSON.parse(JSON.stringify(this.offerOptions)));
        console.log('Available leads in memory:', JSON.parse(JSON.stringify(this.leadOptions)));

        // Reset dynamic field values when category changes
        this.offerId = '';
        this.unitSaleId = '';
        this.invoiceId = '';
        this.leadId = '';
    }

    // New handlers for related lists
    handleOffer(e)    { this.offerId = e.target.value; }
    handleUnitSale(e) { this.unitSaleId = e.target.value; }
    handleInvoice(e)  { this.invoiceId = e.target.value; }
    handleLead(e)     { this.leadId = e.target.value; }

    onFieldFocus(e) {
        const field = e.currentTarget.closest('.ccs-field');
        if (field) this._animateBarIn(field);
    }

    onFieldBlur(e) {
        const field = e.currentTarget.closest('.ccs-field');
        if (field) this._animateBarOut(field, !!e.target.value);
    }

    // ════════════════════════════════════════════════════════════════════════
    // FILE HANDLING
    // ════════════════════════════════════════════════════════════════════════

    get dropzoneClass() {
        return `ccs-dropzone${this.isDragOver ? ' ccs-dropzone--dragover' : ''}${this.hasFile ? ' ccs-dropzone--has-file' : ''}`;
    }

    triggerFileInput(e) {
        // Don't re-trigger when clicking the remove button
        if (e.target.closest('.ccs-drop__remove')) return;
        this._q('[data-file-input]').click();
    }

    handleFileChange(e) {
        const file = e.target.files && e.target.files[0];
        if (file) this._processFile(file);
    }

    handleDragOver(e) {
        e.preventDefault();
        this.isDragOver = true;
    }

    handleDragLeave() {
        this.isDragOver = false;
    }

    handleDrop(e) {
        e.preventDefault();
        this.isDragOver = false;
        const file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
        if (file) this._processFile(file);
    }

    _processFile(file) {
        const maxBytes = 5 * 1024 * 1024;
        if (file.size > maxBytes) {
            this.errorMessage = 'File exceeds the 5 MB limit. Please choose a smaller file.';
            return;
        }
        this.errorMessage = '';
        this.fileName = file.name;
        this.hasFile  = true;

        const reader = new FileReader();
        reader.onload = (ev) => {
            // Strip the data-URL prefix to get raw base64
            this.base64Data = ev.target.result.split(',')[1];
        };
        reader.readAsDataURL(file);
    }

    removeFile(e) {
        e.stopPropagation();
        this.hasFile    = false;
        this.fileName   = '';
        this.base64Data = '';
        const fi = this._q('[data-file-input]');
        if (fi) fi.value = '';
    }

    // ════════════════════════════════════════════════════════════════════════
    // VALIDATION
    // ════════════════════════════════════════════════════════════════════════

    _validate() {
        let valid = true;

        if (!this.subject.trim()) {
            this.subjectError = 'Subject is required.';
            valid = false;
        }
        if (!this.category) {
            this.categoryError = 'Please select a category.';
            valid = false;
        }
        if (!this.description.trim()) {
            this.descriptionError = 'A description is required.';
            valid = false;
        }

        // Mark invalid fields for shake animation
        this._qa('.js-field').forEach((field) => {
            const hasErr = field.querySelector('.ccs-field__error');
            field.classList.toggle('ccs-field--invalid', !!hasErr);
        });

        if (!valid) {
            // Run after LWC re-renders error messages into DOM
            // eslint-disable-next-line @lwc/lwc/no-async-operation
            setTimeout(() => this._shakeInvalidFields(), 30);
        }

        return valid;
    }

    // ════════════════════════════════════════════════════════════════════════
    // SUBMIT
    // ════════════════════════════════════════════════════════════════════════

    async handleSubmit() {
        this.errorMessage = '';

        if (!this._validate()) return;

        this.isSubmitting = true;

        try {
            const id = await createCase({
                subject       : this.subject.trim(),
                category      : this.category,
                description   : this.description.trim(),
                base64FileData: this.base64Data || null,
                fileName      : this.fileName   || null,
                // --- NEW PAYLOAD FIELDS ---
                offerId       : this.offerId    || null,
                unitSaleId    : this.unitSaleId || null,
                invoiceId     : this.invoiceId  || null,
                leadId        : this.leadId     || null
            });

            this.createdCaseId = id;
            this.submitted     = true;
            this._animateSuccessIn();

        } catch (err) {
            this.errorMessage =
                err?.body?.message ||
                err?.message       ||
                'An unexpected error occurred. Please try again.';
        } finally {
            this.isSubmitting = false;
        }
    }

    // ════════════════════════════════════════════════════════════════════════
    // RESET
    // ════════════════════════════════════════════════════════════════════════

    resetForm() {
        this.subject          = '';
        this.category         = '';
        this.description      = '';
        this.fileName         = '';
        this.base64Data       = '';
        this.hasFile          = false;
        this.submitted        = false;
        this.createdCaseId    = '';
        this.errorMessage     = '';
        this.subjectError     = '';
        this.categoryError    = '';
        this.descriptionError = '';

        // Reset new fields
        this.offerId = '';
        this.unitSaleId = '';
        this.invoiceId = '';
        this.leadId = '';

        // Re-run entrance animation after LWC re-renders form
        // eslint-disable-next-line @lwc/lwc/no-async-operation
        setTimeout(() => {
            if (this._gsapReady) this._runEntranceTimeline();
        }, 80);
    }

    // ════════════════════════════════════════════════════════════════════════
    // COMPUTED GETTERS
    // ════════════════════════════════════════════════════════════════════════

    get submitBtnClass() {
        return `ccs-btn ccs-btn--primary${this.isSubmitting ? ' ccs-btn--busy' : ''}`;
    }
}