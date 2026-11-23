import { LightningElement, api } from 'lwc';
import isGuest from '@salesforce/user/isGuest';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import getMyEOIs from '@salesforce/apex/CpEoiPortalController.getMyEOIs';
import getGuestEOIs from '@salesforce/apex/CpEoiPortalController.getGuestEOIs';
import cancelEOI from '@salesforce/apex/CpEoiPortalController.cancelEOI';

export default class CpEoiList extends LightningElement {
    _guestEmail;
    @api guestPhone;

    guestEOILoaded = false;

    eois = [];
    isLoading = false;
    error;
    selectedProject = '';
    appliedProject = '';
    selectedStatus = '';
    appliedStatus = '';

    showCreateEOIModal = false;

    isGuestUser = isGuest;

    connectedCallback() {
        if (!this.isGuestUser) {
            this.loadEOIs();
        }
    }

    get guestEmail() {
        return this._guestEmail;
    }

    @api set guestEmail(value) {
        this._guestEmail = value;
        console.log('EOI List: guestEmail:', this.guestEmail, 'value:', value);
        if (this.isGuestUser && this.guestEmail && !this.guestEOILoaded) {
            this.guestEOILoaded = true;
            this.loadGuestEois();
        }   
    }

    // Dynamic reactive getter (do not declare hideCreateEoi as a class field above)
    get hideCreateEoi() {
        if (!this.isGuestUser) {
            return false;
        }

        return this.eois.some(eoi => {
            const status = (eoi.status || '').trim().toLowerCase();
            return status === 'received';
        });
    }

    loadEOIs() {
        this.isLoading = true;
        this.error = undefined;

        getMyEOIs()
            .then(result => {
                this.eois = (result || []).map(eoi => ({
                    ...eoi,
                    status: eoi.status,
                    statusClass: this.getStatusClass(eoi.status),
                    canCancel:
                        eoi.status === 'Initiated'
                        
                }));
            })
            .catch(error => {
                console.error(
                    'EOI List: Error loading EOIs:',
                    JSON.stringify(error)
                );
                this.eois = [];
                this.error =
                    error?.body?.message ||
                    'Unable to load your Expressions of Interest.';
            })
            .finally(() => {
                this.isLoading = false;
            });
    }

    async loadGuestEois() {
        if (!this.guestEmail) {
            console.error('Guest email is not provided.');
            return; 
        }

        this.isLoading = true;
        this.error = undefined;

        try {
            const result = await getGuestEOIs({ email: this.guestEmail });
            console.log('EOI List: Guest EOIs loaded:', JSON.stringify(result, null, 2));
            this.eois = (result || []).map(eoi => ({
                ...eoi,
                status: eoi.status,
                statusClass: this.getStatusClass(eoi.status),
                canCancel:
                    eoi.status === 'Initiated' ||
                    eoi.status === 'Received'
            }));
        } catch (error) {
            console.error(
                'EOI List: Error loading guest EOIs:',
                JSON.stringify(error)
            );
            this.error = 'Unable to load guest Expressions of Interest.';
        } finally {
            this.isLoading = false;
        }
    }

    get hasEOIs() {
        return !this.isLoading && this.eois.length > 0;
    }

    get showNoEOI() {
        return !this.isLoading &&
            !this.error &&
            this.eois.length === 0;
    }

    handleNewEOI() {
        this.showCreateEOIModal = true;
    }

    handleCloseModal() {
        this.showCreateEOIModal = false;
    }

    handleEOICreated() {
        this.showCreateEOIModal = false;
        if (this.isGuestUser) {
            this.loadGuestEois();
        } else {
            this.loadEOIs();
        }
    }

    async handleCancel(event) {
        const eoiId = event.currentTarget.dataset.id;
        const eoi = this.eois.find(item => item.eoiId === eoiId);

        if (!eoi) {
            console.log('EOI not found:', eoiId);
            return;
        }

        let newStatus;
        if (eoi.status === 'Initiated') {
            newStatus = 'Cancelled';
        } else if (eoi.status === 'Received') {
            newStatus = 'Refund Requested';
        } else {
            return;
        }

        try {
            await cancelEOI({
                eoiId: eoiId,
                newStatus: newStatus
            });

            this.eois = this.eois.map(item => {
                if (item.eoiId === eoiId) {
                    return {
                        ...item,
                        status: newStatus,
                        statusClass: this.getStatusClass(newStatus),
                        canCancel: false
                    };
                }
                return item;
            });

            if (eoi.status === 'Received') {
                this.dispatchEvent(
                    new ShowToastEvent({
                        title: 'Request Sent',
                        message: 'Cancellation request has been sent for approval.',
                        variant: 'success'
                    })
                );
            }

        } catch (error) {
            console.error('Cancel EOI failed:', error);
            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'Error',
                    message: error.body?.message || 'Unable to process cancellation request.',
                    variant: 'error'
                })
            );
        }
    }

    getStatusClass(status) {
        if (status === 'Received') {
            return 'status-badge status-success';
        }
        if (status === 'Initiated') {
            return 'status-badge status-warning';
        }
        if (status === 'Cancelled') {
            return 'status-badge status-cancelled';
        }
        return 'status-badge';
    }

    get projectFilterOptions() {
        const projects = new Set();
        this.eois.forEach(eoi => {
            if (eoi.projectName) {
                projects.add(eoi.projectName);
            }
        });

        return Array.from(projects).map(project => ({
            label: project,
            value: project
        }));
    }

    get statusFilterOptions() {
        const statuses = new Set();
        this.eois.forEach(eoi => {
            if (eoi.status) {
                statuses.add(eoi.status);
            }
        });

        return Array.from(statuses).map(status => ({
            label: status,
            value: status
        }));
    }

    handleProjectFilter(event) {
        this.selectedProject = event.target.value;
    }

    handleStatusFilter(event) {
        this.selectedStatus = event.target.value;
    }

    handleApplyFilters() {
        this.appliedProject = this.selectedProject;
        this.appliedStatus = this.selectedStatus;
    }

    get filteredEOIs() {
        return this.eois.filter(eoi =>
            (!this.appliedProject || eoi.projectName === this.appliedProject) &&
            (!this.appliedStatus || eoi.status === this.appliedStatus)
        );
    }

    handleView(event) {
        const eoiId = event.currentTarget.dataset.id;
        this.dispatchEvent(
            new CustomEvent('view', {
                detail: eoiId
            })
        );
    }
}