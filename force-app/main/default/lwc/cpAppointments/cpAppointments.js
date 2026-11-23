import { LightningElement, wire, track } from 'lwc';
import { refreshApex } from '@salesforce/apex';
import getUserAppointments from '@salesforce/apex/AppointmentController.getUserAppointments';
import cancelAppointment   from '@salesforce/apex/AppointmentController.cancelAppointment';
import createAppointment      from '@salesforce/apex/AppointmentController.createAppointment';
import rescheduleAppointment  from '@salesforce/apex/AppointmentController.rescheduleAppointment';
import getUserEnquiries       from '@salesforce/apex/AppointmentController.getUserEnquiries';

// Time slots: 9 AM – 6 PM (start times); end = start + 1 hr
const SLOT_HOURS = [9,10,11,12,13,14,15,16,17,18];

function fmt12(h) {
    const suffix = h >= 12 ? 'PM' : 'AM';
    const h12    = h > 12 ? h - 12 : h === 0 ? 12 : h;
    return `${h12}:00 ${suffix}`;
}

export default class CpAppointments extends LightningElement {

    // ── Appointments list ─────────────────────────────────────────
    @track upcomingAppointments = [];
    @track pastAppointments     = [];

    showModal   = false;
    showSuccess = false;
    isDeleting  = false;
    isUpcoming  = true;
    selectedEventId;

    // ── Reschedule modal ──────────────────────────────────────────
    showRescheduleModal  = false;
    rescheduleEventId    = null;
    rescheduleDate       = '';
    rescheduleStartTime  = null;
    isRescheduling       = false;
    rescheduleSuccess    = false;
    rescheduleError      = '';
    rescheduleDateError  = '';
    rescheduleTimeError  = '';

    // ── Booking form ──────────────────────────────────────────────
    formDate      = '';
    formStartTime = null;   // numeric hour, e.g. 9
    formNotes     = '';
    isBooking     = false;
    bookingSuccess = false;
    bookingError   = '';
    dateError      = '';
    timeError      = '';
    selectedLeadId = null;
    leadError      = '';

    @track enquiryOptions = [];

    // ── Computed: today's date string for min attribute ───────────
    get todayDate() {
        const d = new Date();
        return d.toISOString().split('T')[0];
    }

    get formEndTimeLabel() {
        if (this.formStartTime === null) return '';
        return fmt12(this.formStartTime + 1);
    }

    get dateInputClass() {
        return this.dateError ? 'form-input form-input--error' : 'form-input';
    }

    get leadSelectClass() {
        return this.leadError ? 'form-select form-select--error' : 'form-select';
    }

    get rescheduleDateInputClass() {
        return this.rescheduleDateError ? 'form-input form-input--error' : 'form-input';
    }

    get rescheduleEndTimeLabel() {
        if (this.rescheduleStartTime === null) return '';
        return fmt12(this.rescheduleStartTime + 1);
    }

    get rescheduleTimeSlots() {
        return SLOT_HOURS.map(h => ({
            value   : h,
            label   : fmt12(h),
            btnClass: `time-slot${this.rescheduleStartTime === h ? ' time-slot--active' : ''}`
        }));
    }

    // ── Time slot buttons ─────────────────────────────────────────
    get timeSlots() {
        return SLOT_HOURS.map(h => ({
            value   : h,
            label   : fmt12(h),
            btnClass: `time-slot${this.formStartTime === h ? ' time-slot--active' : ''}`
        }));
    }

    // ── Tab classes ───────────────────────────────────────────────
    get upcomingClass() { return this.isUpcoming ? 'active' : ''; }
    get pastClass()     { return !this.isUpcoming ? 'active' : ''; }

    get rowClass() {
        return this.isUpcoming ? 'appointment-row' : 'appointment-row past-view';
    }

    get tableHeaderClass() {
        return this.isUpcoming ? 'table-header' : 'table-header past-view';
    }

    // ── Visible rows ──────────────────────────────────────────────
    get visibleAppointments() {
        return this.isUpcoming ? this.upcomingAppointments : this.pastAppointments;
    }

    get isEmpty()    { return this.visibleAppointments.length === 0; }
    get emptyLabel() { return this.isUpcoming ? 'upcoming' : 'past'; }

    // ── Wire ──────────────────────────────────────────────────────
    @wire(getUserAppointments)
    wiredAppointments(result) {
        this._wiredResult = result;  // store for refreshApex
        const { data, error } = result;
        if (data) {
            this.upcomingAppointments = this.formatAppointments(data.upcoming ?? []);
            this.pastAppointments    = this.formatAppointments(data.past ?? []);
        } else if (error) {
            console.error('Error fetching appointments:', error);
        }
    }

    // ── Wire: enquiries ──────────────────────────────────────────
    @wire(getUserEnquiries)
    wiredEnquiries({ data, error }) {
        if (data) {
            this.enquiryOptions = data.map(l => ({
                value : l.Id,
                label : [
                    l.Enquiry_Number__c,
                    l.Interested_In_Project__r?.Name
                ].filter(Boolean).join(' - ')
            }));
        } else if (error) {
            console.error('Error fetching enquiries:', error);
        }
    }

    // ── Formatting helpers ────────────────────────────────────────
    // Salesforce returns StartDateTime/EndDateTime as UTC ISO strings.
    // We parse the UTC parts directly to avoid browser timezone conversion.
    formatAppointments(list) {
        if (!Array.isArray(list)) return [];
        return list.map(e => {
            const status = e.Status__c || 'Scheduled';
            return {
                ...e,
                formattedDate : this._fmtDateUTC(e.StartDateTime),
                formattedTime : e.EndDateTime
                    ? `${this._fmt12UTC(e.StartDateTime)} — ${this._fmt12UTC(e.EndDateTime)}`
                    : this._fmt12UTC(e.StartDateTime),
                agentInitials  : this._initials(e.Owner?.Name),
                statusClass    : `status-badge ${this._statusClass(status)}`,
                isCancellable  : status !== 'Cancelled' && status !== 'Completed',
                isoDate        : e.StartDateTime.split('T')[0],
                startHour      : new Date(e.StartDateTime).getHours(),
                enquiryLabel   : e.Interested_Project__c || '—'
            };
        });
    }

    // Format using the browser's local timezone — this matches the Salesforce
    // user timezone since both should be set to the same zone (IST).
    // DateTime.newInstance() in Apex stores relative to the running user's timezone.
    _fmtDateUTC(isoString) {
        const d = new Date(isoString);
        return d.toLocaleDateString('en-US', {
            month: 'short', day: 'numeric', year: 'numeric'
        });
    }

    _fmt12UTC(isoString) {
        const d = new Date(isoString);
        return d.toLocaleTimeString('en-US', {
            hour: '2-digit', minute: '2-digit', hour12: true
        });
    }

    _initials(name = '') {
        return name.trim().split(' ')
            .slice(0, 2)
            .map(w => w[0]?.toUpperCase() ?? '')
            .join('');
    }

    _statusClass(status) {
        const map = {
            'Scheduled' : 'status-scheduled',
            'Cancelled' : 'status-cancelled',
            'Completed' : 'status-completed'
        };
        return map[status] || 'status-default';
    }

    // ── Tab handlers ──────────────────────────────────────────────
    showUpcoming() { this.isUpcoming = true; }
    showPast()     { this.isUpcoming = false; }

    // ── Booking form handlers ─────────────────────────────────────
    handleDateChange(event) {
        this.formDate  = event.target.value;
        this.dateError = '';
        this.bookingSuccess = false;
        this.bookingError   = '';
    }

    handleTimeSelect(event) {
        this.formStartTime = parseInt(event.currentTarget.dataset.value, 10);
        this.timeError     = '';
        this.bookingSuccess = false;
        this.bookingError   = '';
    }

    handleNotesChange(event) {
        this.formNotes = event.target.value;
    }

    handleLeadChange(event) {
        this.selectedLeadId = event.target.value;
        this.leadError      = '';
        this.bookingSuccess = false;
        this.bookingError   = '';
    }

    submitBooking() {
        // Validate
        let valid = true;

        if (!this.formDate) {
            this.dateError = 'Please select a date.';
            valid = false;
        } else {
            const chosen = new Date(this.formDate + 'T00:00:00');
            const today  = new Date();
            today.setHours(0, 0, 0, 0);
            if (chosen < today) {
                this.dateError = 'Please choose a future date.';
                valid = false;
            }
        }

        if (this.formStartTime === null) {
            this.timeError = 'Please select a start time.';
            valid = false;
        }

        if (!this.selectedLeadId) {
            this.leadError = 'Please select an enquiry.';
            valid = false;
        }

        if (!valid) return;

        this.isBooking    = true;
        this.bookingError = '';

        const utcOffsetMinutes = -new Date().getTimezoneOffset();

        createAppointment({
            leadId          : this.selectedLeadId,
            dateStr         : this.formDate,
            startHour       : this.formStartTime,
            endHour         : this.formStartTime + 1,
            utcOffsetMinutes: utcOffsetMinutes,
            notes           : this.formNotes
        })
        .then(() => {
            this.bookingSuccess = true;
            this.isBooking      = false;

            // Reset form
            this.formDate       = '';
            this.formStartTime  = null;
            this.formNotes      = '';
            this.selectedLeadId = null;

            // Refresh the wire cache — do NOT call getUserAppointments() imperatively
            // after a DML; use refreshApex on the stored wire result instead.
            return refreshApex(this._wiredResult);
        })
        .then(() => {
            // list already updated by wiredAppointments callback above
        })
        .catch(error => {
            this.isBooking    = false;
            this.bookingError = error?.body?.message || 'Something went wrong. Please try again.';
        });
    }

    // ── Reschedule modal ─────────────────────────────────────────
    openRescheduleModal(event) {
        const { id, date, hour } = event.currentTarget.dataset;
        this.rescheduleEventId   = id;
        this.rescheduleDate      = date;
        this.rescheduleStartTime = parseInt(hour, 10);
        this.rescheduleSuccess   = false;
        this.rescheduleError     = '';
        this.rescheduleDateError = '';
        this.rescheduleTimeError = '';
        this.showRescheduleModal = true;
    }

    closeRescheduleModal() {
        this.showRescheduleModal = false;
        this.isRescheduling      = false;
        this.rescheduleSuccess   = false;
        this.rescheduleError     = '';
    }

    handleRescheduleBackdropClick(event) {
        if (event.target === event.currentTarget) this.closeRescheduleModal();
    }

    handleRescheduleDateChange(event) {
        this.rescheduleDate      = event.target.value;
        this.rescheduleDateError = '';
    }

    handleRescheduleTimeSelect(event) {
        this.rescheduleStartTime = parseInt(event.currentTarget.dataset.value, 10);
        this.rescheduleTimeError = '';
    }

    confirmReschedule() {
        let valid = true;

        if (!this.rescheduleDate) {
            this.rescheduleDateError = 'Please select a date.';
            valid = false;
        } else {
            const chosen = new Date(this.rescheduleDate + 'T00:00:00');
            const today  = new Date();
            today.setHours(0, 0, 0, 0);
            if (chosen < today) {
                this.rescheduleDateError = 'Please choose a future date.';
                valid = false;
            }
        }

        if (this.rescheduleStartTime === null) {
            this.rescheduleTimeError = 'Please select a start time.';
            valid = false;
        }

        if (!valid) return;

        this.isRescheduling  = true;
        this.rescheduleError = '';

        const utcOffsetMinutes = -new Date().getTimezoneOffset();

        rescheduleAppointment({
            eventId         : this.rescheduleEventId,
            dateStr         : this.rescheduleDate,
            startHour       : this.rescheduleStartTime,
            endHour         : this.rescheduleStartTime + 1,
            utcOffsetMinutes: utcOffsetMinutes
        })
        .then(() => {
            this.rescheduleSuccess = true;
            this.isRescheduling    = false;
            return refreshApex(this._wiredResult);
        })
        .then(() => {
            setTimeout(() => { this.closeRescheduleModal(); }, 1200);
        })
        .catch(error => {
            this.isRescheduling  = false;
            this.rescheduleError = error?.body?.message || 'Something went wrong. Please try again.';
        });
    }

    // ── Cancel modal ──────────────────────────────────────────────
    openConfirmModal(event) {
        this.selectedEventId = event.currentTarget.dataset.id;
        this.showModal   = true;
        this.showSuccess = false;
    }

    closeModal() {
        this.showModal   = false;
        this.isDeleting  = false;
        this.showSuccess = false;
    }

    handleBackdropClick(event) {
        if (event.target === event.currentTarget) this.closeModal();
    }

    confirmCancel() {
        this.isDeleting = true;

        cancelAppointment({ eventId: this.selectedEventId })
            .then(() => {
                this.showSuccess = true;

                const updateStatus = (list) => list.map(a =>
                    a.Id === this.selectedEventId
                        ? { ...a,
                            Status__c    : 'Cancelled',
                            statusClass  : 'status-badge status-cancelled',
                            isCancellable: false }
                        : a
                );

                this.upcomingAppointments = updateStatus(this.upcomingAppointments);
                this.pastAppointments     = updateStatus(this.pastAppointments);

                setTimeout(() => {
                    this.showModal  = false;
                    this.isDeleting = false;
                }, 1200);
            })
            .catch(error => {
                console.error('Cancel error:', error);
                this.isDeleting = false;
            });
    }
}