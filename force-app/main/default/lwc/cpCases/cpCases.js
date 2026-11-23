import { LightningElement, track, wire } from 'lwc';
import { NavigationMixin }             from 'lightning/navigation';
import { refreshApex }                 from '@salesforce/apex';
import getCases                        from '@salesforce/apex/CasePortalController.getCases';
import createCase                      from '@salesforce/apex/CasePortalController.createCase';

const STATUS_CLASS_MAP = {
    'Resolved'    : 'status-badge status-resolved',
    'Closed'      : 'status-badge status-resolved',
    'In Progress' : 'status-badge status-in-progress',
    'New'         : 'status-badge status-open',
    'Open'        : 'status-badge status-open',
};

export default class CpCasePage extends NavigationMixin(LightningElement) {

    // ── Form fields ──────────────────────────────────────────────────────────
    @track subject     = '';
    @track category    = '';
    @track description = '';
    @track fileName    = '';
    @track base64Data  = '';

    // ── UI state ─────────────────────────────────────────────────────────────
    @track isSubmitting  = false;
    @track isLoading     = true;
    @track successMessage = '';
    @track errorMessage   = '';

    // ── Wire ─────────────────────────────────────────────────────────────────
    _wiredCasesResult;
    @track cases = [];

    @wire(getCases)
    wiredCases(result) {
        this._wiredCasesResult = result;
        this.isLoading = false;
        if (result.data) {
            this.cases = result.data.map(c => this._enrichCase(c));
        } else if (result.error) {
            this.errorMessage = 'Could not load your case history.';
        }
    }

    get hasCases() {
        return this.cases && this.cases.length > 0;
    }


     //new
    handleCaseClick(event) {
    const caseId = event.currentTarget.dataset.id;

    this[NavigationMixin.Navigate]({
        type: 'comm__namedPage',
        attributes: {
            name: 'caseComments__c' 
        },
        state: {
            recordId: caseId
        }
    });
}


    // ── Enrich case rows ─────────────────────────────────────────────────────
    _enrichCase(c) {
        return {
            ...c,
            statusClass  : STATUS_CLASS_MAP[c.Status] || 'status-badge status-open',
            relativeDate : this._relativeDate(c.LastModifiedDate),
            categoryDate : `${c.Type || 'GENERAL'} • ${this._formatDate(c.CreatedDate)}`,
        };
    }

    _relativeDate(dateStr) {
        if (!dateStr) return '';
        const diff = Date.now() - new Date(dateStr).getTime();
        const hrs  = Math.floor(diff / 3600000);
        if (hrs < 1)   return 'Just now';
        if (hrs < 24)  return `${hrs}h ago`;
        const days = Math.floor(hrs / 24);
        if (days === 1) return 'Yesterday';
        if (days < 7)  return `${days} days ago`;
        return this._formatDate(dateStr);
    }

    _formatDate(dateStr) {
        if (!dateStr) return '';
        return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }

    // ── Form handlers ────────────────────────────────────────────────────────
    handleSubjectChange(e)     { this.subject     = e.target.value; }
    handleCategoryChange(e)    { this.category    = e.target.value; }
    handleDescriptionChange(e) { this.description = e.target.value; }

    triggerFileInput() {
        this.template.querySelector('[data-id="fileInput"]').click();
    }

    handleFileChange(e) {
        const file = e.target.files[0];
        if (!file) return;
        this.fileName = file.name;
        const reader  = new FileReader();
        reader.onloadend = () => {
            // Strip the data URL prefix (e.g. "data:image/png;base64,")
            this.base64Data = reader.result.split(',')[1];
        };
        reader.readAsDataURL(file);
    }

    async handleSubmit() {
        this.successMessage = '';
        this.errorMessage   = '';

        if (!this.subject.trim()) {
            this.errorMessage = 'Please enter a subject.';
            return;
        }
        if (!this.category) {
            this.errorMessage = 'Please select a category.';
            return;
        }

        this.isSubmitting = true;
        try {
            await createCase({
                subject      : this.subject,
                category     : this.category,
                description  : this.description,
                base64FileData: this.base64Data,
                fileName     : this.fileName,
            });

            this.successMessage = 'Your case has been submitted successfully!';
            this._resetForm();
            await refreshApex(this._wiredCasesResult);
            // Re-enrich after refresh
            if (this._wiredCasesResult.data) {
                this.cases = this._wiredCasesResult.data.map(c => this._enrichCase(c));
            }
        } catch (err) {
            this.errorMessage = err.body?.message || 'An error occurred. Please try again.';
        } finally {
            this.isSubmitting = false;
        }
    }

    _resetForm() {
        this.subject     = '';
        this.category    = '';
        this.description = '';
        this.fileName    = '';
        this.base64Data  = '';
    }
}