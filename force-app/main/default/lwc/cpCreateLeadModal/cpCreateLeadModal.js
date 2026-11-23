import { LightningElement, api, track, wire } from 'lwc';
import USER_ID from '@salesforce/user/Id';
import { getRecord } from 'lightning/uiRecordApi';
import { NavigationMixin } from 'lightning/navigation'

import getFieldSetFields from '@salesforce/apex/cpLeadFieldSetController.getFieldSetFields';
import createLead from '@salesforce/apex/CpCTALeadController.createLeadFromProjectGallery';
import getBrokerAccounts from '@salesforce/apex/CpCTALeadController.getBrokerAccounts';
import getBrokerAgents from '@salesforce/apex/CpCTALeadController.getBrokerAgents';

import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import Toast from 'lightning/toast';

const USER_FIELDS = ['User.ContactId'];

const CONTACT_FIELDS = [
    'Contact.FirstName',
    'Contact.LastName',
    'Contact.Email',
    'Contact.MobilePhone',
    'Contact.AccountId',
    'Contact.Account.Type'
];

const path = window.location.pathname;
const siteName = path.split('/')[1];

const CUSTOMER_PORTAL = 'mdrealty';

export default class CpCreateLeadModal extends NavigationMixin(LightningElement) {

    @api projectName = '';
    @api projectId = '';

    userId = USER_ID;
    contactId;

    @track isBrokerPortal = false;
    @track fields = [];
    @track formData = {};

    @track isBrokerEnabled = false;
    @track brokerAccountId = '';
    @track brokerAgentId = '';
    @track brokerAccountOptions = [];
    @track brokerAgentOptions = [];

    isLoading = false;
    @track showError = false;
    @track errorMessage = '';
    @track showSuccessToast=false;

    _isOpen = false;

    @api
    get isOpen() {
        return this._isOpen;
    }

    set isOpen(value) {
        this._isOpen = value;
        if (value) {
            this.showError = false;
            this.errorMessage = '';
        }
    }

    connectedCallback() {
        this.loadFields();
        this.loadBrokerAccounts();
    }

    // ---------------- USER DATA ----------------
    @wire(getRecord, { recordId: '$userId', fields: USER_FIELDS })
    wiredUser({ data, error }) {
        if (data) {
            this.contactId = data.fields.ContactId?.value;
        } else if (error) {
            console.error('User wire error:', error);
        }
    }

    // ---------------- CONTACT + AUTO-FETCH ----------------
    @wire(getRecord, { recordId: '$contactId', fields: CONTACT_FIELDS })
    wiredContact({ data, error }) {
        if (data) {
            const accountType = data.fields.Account?.value?.fields?.Type?.value;
            const accountId = data.fields.AccountId?.value;
            this.isBrokerPortal = accountType === 'Broker';

            // Auto-fetch for non-broker users
            if (!this.isBrokerPortal) {
                this.formData = {
                    ...this.formData,
                    FirstName: data.fields.FirstName?.value || '',
                    LastName: data.fields.LastName?.value || '',
                    Email: data.fields.Email?.value || '',
                    MobilePhone: data.fields.MobilePhone?.value || ''
                };

                 // Disable autofetched fields
                this.fields = this.fields.map(f => {
                return {
                    ...f,
                    isDisabled:
                        !this.isBrokerPortal &&
                        (
                            f.apiName === 'FirstName' ||
                            f.apiName === 'LastName' ||
                            f.apiName === 'Email' ||
                            f.apiName === 'MobilePhone'
                        )
                };
            });

                
                if (this.fields && this.fields.length > 0) {
                    this.syncFieldsWithFormData();
                }
            }

            if (this.isBrokerPortal && accountId) {
                this.isBrokerEnabled = true;
                this.brokerAccountId = accountId;
                this.brokerAccountOptions = [{ label: 'My Broker Account', value: accountId }];
                this.loadBrokerAgents(accountId);
            }
        } else if (error) {
            console.error('Contact wire error:', error);
        }
    }

    // ---------------- FIELDSET ----------------
    async loadFields() {
        try {
            const data = await getFieldSetFields();
            const requiredFields = ['FirstName', 'LastName', 'Email', 'MobilePhone'];

            this.fields = data.map(f => ({
                ...f,
                inputType: f.type === 'EMAIL' ? 'email' : f.type === 'PHONE' ? 'tel' : 'text',
                isPicklist: f.type === 'PICKLIST',
                required: requiredFields.includes(f.apiName) || f.required,
                
                value: this.formData[f.apiName] || '' 
            }));
        } catch (err) {
            console.error('Error loading fields:', err);
        }
    }

    syncFieldsWithFormData() {
        this.fields = this.fields.map(f => ({
            ...f,
            value: this.formData[f.apiName] || f.value
        }));
    }

    // ---------------- BROKER LOGIC ----------------
    async loadBrokerAccounts() {
        const result = await getBrokerAccounts();
        this.brokerAccountOptions = result.map(a => ({ label: a.Name, value: a.Id }));
    }

    async loadBrokerAgents(accountId) {
        if (!accountId) return;
        const res = await getBrokerAgents({ accountId });
        this.brokerAgentOptions = res.map(c => ({ label: c.Name, value: c.Id }));
    }

    handleBrokerToggle(e) {
        this.isBrokerEnabled = e.target.checked;
        if (!this.isBrokerEnabled) {
            this.brokerAccountId = '';
            this.brokerAgentId = '';
            this.brokerAgentOptions = [];
        }
    }

    async handleBrokerAccountChange(e) {
        this.brokerAccountId = e.target.value;
        this.brokerAgentId = '';
        if (this.brokerAccountId) {
            await this.loadBrokerAgents(this.brokerAccountId);
        }
    }

    handleBrokerAgentChange(e) {
        this.brokerAgentId = e.target.value;
    }

    // ---------------- INPUTS ----------------
    handleChange(e) {
        const fieldName = e.target.name;
        const value = e.target.value;

        this.formData = { ...this.formData, [fieldName]: value };

        
        this.fields = this.fields.map(f => {
            if (f.apiName === fieldName) {
                return { ...f, value: value };
            }
            return f;
        });
    }

    
    async handleSubmit(e) {
        e.preventDefault();
        this.isLoading = true;

        // Validation
        const missing = this.fields
            .filter(f => f.required && !this.formData[f.apiName])
            .map(f => f.label);

        if (missing.length) {
            this.showToast('Error', `Please fill: ${missing.join(', ')}`, 'error');
            this.isLoading = false;
            return;
        }

        if (this.isBrokerSectionVisible && !this.brokerAgentId) {
            this.showToast('Error', 'Broker Agent is required', 'error');
            this.isLoading = false;
            return;
        }

        try {
            const payload = {
                firstName: this.formData.FirstName,
                lastName: this.formData.LastName,
                email: this.formData.Email,
                phone: this.formData.Phone || this.formData.MobilePhone,
                company: this.formData.Company,
                description: `Enquiry for project: ${this.projectName}`,
                projectId: this.projectId,
                brokerAccountId: (this.isBrokerEnabled || this.isBrokerPortal) ? this.brokerAccountId : null,
                brokerAgentId: (this.isBrokerEnabled || this.isBrokerPortal) ? this.brokerAgentId : null,
                isBrokerPortal: !!this.isBrokerPortal
            };

            const leadId = await createLead(payload);
        //      Toast.show({
        //     label: 'Success',
        //     message: 'Enquiry sent successfully',
        //     variant: 'success',
        //     mode: 'dismissible'
        // });
        this.showSuccessToast = true;
            this.resetForm();
             setTimeout(() => {
            this.handleClose();
        }, 2000);

        const params = new URLSearchParams({
            enquiryId: leadId,
        })
        
        if(siteName === CUSTOMER_PORTAL) {
            this[NavigationMixin.Navigate]({
                type: 'standard__webPage',
                attributes: {
                    url: `/journeys?${params.toString()}`
                }
            });
        }
        
        } catch (err) {
            this.showError = true;
            this.errorMessage = err?.body?.message || 'Failed to create Lead';
            this.showToast('Error', this.errorMessage, 'error');
        } finally {
            this.isLoading = false;
        }
    }

    resetForm() {
        this.formData = {};
        this.fields = this.fields.map(f => ({ ...f, value: '' }));
    }

    handleClose() {
        this.dispatchEvent(new CustomEvent('close'));
    }

    showToast(title, message, variant) {
        this.dispatchEvent(new ShowToastEvent({ title, message, variant }));
    }

    get brokerAgentDisabled() { return !this.brokerAccountId; }
    get isBrokerSectionVisible() { return this.isBrokerEnabled || this.isBrokerPortal; }
}