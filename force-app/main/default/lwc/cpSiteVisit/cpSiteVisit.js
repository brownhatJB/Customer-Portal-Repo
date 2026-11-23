import { LightningElement, api, wire, track } from 'lwc';
import { refreshApex } from '@salesforce/apex';
import getEnquiryAppointments from '@salesforce/apex/AppointmentController.getEnquiryAppointments';
import cancelAppointment      from '@salesforce/apex/AppointmentController.cancelAppointment';
import createAppointment      from '@salesforce/apex/AppointmentController.createAppointment';
import rescheduleAppointment  from '@salesforce/apex/AppointmentController.rescheduleAppointment';
import updateEOIFlag from '@salesforce/apex/GetMyEnquiries.updateEOIFlag';

// Time slots: 9 AM – 6 PM (start times); end = start + 1 hr
const SLOT_HOURS = [9, 10, 11, 12, 13, 14, 15, 16, 17, 18];

function fmt12(h) {
    const suffix = h >= 12 ? 'PM' : 'AM';
    const h12    = h > 12 ? h - 12 : h === 0 ? 12 : h;
    return `${h12}:00 ${suffix}`;
}

export default class CpAppointments extends LightningElement {

    // ── Public API — pass the Lead/Enquiry Id from parent ─────────
    @api recordId;   

    // ── Appointments list ─────────────────────────────────────────
    @track appointments = [];
    _wiredResult;

    // ── Cancel modal ──────────────────────────────────────────────
    showModal       = false;
    showSuccess     = false;
    isDeleting      = false;
    selectedEventId;

    // ── Booking modal ─────────────────────────────────────────────
    showBookingModal = false;
    formDate         = '';
    formStartTime    = null;   // numeric hour e.g. 9
    formNotes        = '';
    isBooking        = false;
    bookingSuccess   = false;
    bookingError     = '';
    dateError        = '';
    timeError        = '';

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

    //browse units 
    isBrowseUnitsLoading = false;

    // ── Computed: today's date string for min attribute ───────────
    get todayDate() {
        return new Date().toISOString().split('T')[0];
    }

    get isEmpty() {
        return !this.appointments || this.appointments.length === 0;
    }

    // ── Booking form computed ─────────────────────────────────────
    get formEndTimeLabel() {
        return this.formStartTime !== null ? fmt12(this.formStartTime + 1) : '';
    }

    get dateInputClass() {
        return this.dateError ? 'form-input form-input--error' : 'form-input';
    }

    get timeSlots() {
        return SLOT_HOURS.map(h => ({
            value   : h,
            label   : fmt12(h),
            btnClass: `time-slot${this.formStartTime === h ? ' time-slot--active' : ''}`
        }));
    }

    // ── Reschedule modal computed ─────────────────────────────────
    get rescheduleDateInputClass() {
        return this.rescheduleDateError ? 'form-input form-input--error' : 'form-input';
    }

    get rescheduleEndTimeLabel() {
        return this.rescheduleStartTime !== null ? fmt12(this.rescheduleStartTime + 1) : '';
    }

    get rescheduleTimeSlots() {
        return SLOT_HOURS.map(h => ({
            value   : h,
            label   : fmt12(h),
            btnClass: `time-slot${this.rescheduleStartTime === h ? ' time-slot--active' : ''}`
        }));
    }

    // ── Wire: appointments scoped to this enquiry ─────────────────
    @wire(getEnquiryAppointments, { enqId: '$recordId' })
    wiredAppointments(result) {
        this._wiredResult = result;
        const { data, error } = result;
        if (data) {
            this.appointments = this.formatAppointments(data);
        } else if (error) {
            console.error('Error fetching appointments:', error);
        }
    }

    // ── Formatting helpers ────────────────────────────────────────
    formatAppointments(list) {
        if (!Array.isArray(list)) return [];
        return list.map(e => {
            const status = e.Status__c || 'Scheduled';
            return {
                ...e,
                formattedDate : this._fmtDate(e.StartDateTime),
                formattedTime : e.EndDateTime
                    ? `${this._fmt12(e.StartDateTime)} — ${this._fmt12(e.EndDateTime)}`
                    : this._fmt12(e.StartDateTime),
                agentInitials : this._initials(e.Owner?.Name),
                statusClass   : `status-badge ${this._statusClass(status)}`,
                isCancellable : status !== 'Cancelled' && status !== 'Completed',
                isoDate       : e.StartDateTime.split('T')[0],
                startHour     : new Date(e.StartDateTime).getHours()
            };
        });
    }

    _fmtDate(isoString) {
        return new Date(isoString).toLocaleDateString('en-US', {
            month: 'short', day: 'numeric', year: 'numeric'
        });
    }

    _fmt12(isoString) {
        return new Date(isoString).toLocaleTimeString('en-US', {
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

    // ── Booking modal ─────────────────────────────────────────────
    openBookingModal() {
        this.showBookingModal = true;
        this.bookingSuccess   = false;
        this.bookingError     = '';
        this.dateError        = '';
        this.timeError        = '';
    }

    closeBookingModal() {
        this.showBookingModal = false;
        this.isBooking        = false;
        this.bookingSuccess   = false;
        this.bookingError     = '';
        // reset form
        this.formDate      = '';
        this.formStartTime = null;
        this.formNotes     = '';
    }

    handleBookingBackdropClick(event) {
        if (event.target === event.currentTarget) this.closeBookingModal();
    }

    handleDateChange(event) {
        this.formDate   = event.target.value;
        this.dateError  = '';
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

    submitBooking() {
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

        if (!valid) return;

        this.isBooking    = true;
        this.bookingError = '';

        createAppointment({
            leadId          : this.recordId,          // auto-populated — no dropdown needed
            dateStr         : this.formDate,
            startHour       : this.formStartTime,
            endHour         : this.formStartTime + 1,
            utcOffsetMinutes: -new Date().getTimezoneOffset(),
            notes           : this.formNotes
        })
        .then(() => {
            this.bookingSuccess = true;
            this.isBooking      = false;
            this.formDate       = '';
            this.formStartTime  = null;
            this.formNotes      = '';
            return refreshApex(this._wiredResult);
        })
        .then(() => {
            // Close modal after brief success display
            setTimeout(() => { this.closeBookingModal(); }, 1200);
        })
        .catch(error => {
            this.isBooking    = false;
            this.bookingError = error?.body?.message || 'Something went wrong. Please try again.';
        });
    }

    // ── Reschedule modal ──────────────────────────────────────────
    openRescheduleModal(event) {
        const { id, date, hour }  = event.currentTarget.dataset;
        this.rescheduleEventId    = id;
        this.rescheduleDate       = date;
        this.rescheduleStartTime  = parseInt(hour, 10);
        this.rescheduleSuccess    = false;
        this.rescheduleError      = '';
        this.rescheduleDateError  = '';
        this.rescheduleTimeError  = '';
        this.showRescheduleModal  = true;
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

        rescheduleAppointment({
            eventId         : this.rescheduleEventId,
            dateStr         : this.rescheduleDate,
            startHour       : this.rescheduleStartTime,
            endHour         : this.rescheduleStartTime + 1,
            utcOffsetMinutes: -new Date().getTimezoneOffset()
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

                this.appointments = this.appointments.map(a =>
                    a.Id === this.selectedEventId
                        ? { ...a,
                            Status__c    : 'Cancelled',
                            statusClass  : 'status-badge status-cancelled',
                            isCancellable: false }
                        : a
                );

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

    async handleBrowseUnits() {
        this.isBrowseUnitsLoading = true;
        try {
            await updateEOIFlag({leadId: this.recordId, eoiFlag: 'Interested'})

            const navigateEvent = new CustomEvent('lead2opp', {
                detail: { leadId: this.recordId },
                bubbles: true,
                composed: true
            });
            
            this.dispatchEvent(navigateEvent);
        } catch (error) {
            console.error('Error updating EOI flag', error);
        } finally {
            this.isBrowseUnitsLoading = false;
        }
    }
}