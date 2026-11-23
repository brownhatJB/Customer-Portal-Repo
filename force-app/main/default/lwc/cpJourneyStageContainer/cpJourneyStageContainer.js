import { LightningElement, api } from 'lwc';
import getEnquiryDetails from '@salesforce/apex/GetMyEnquiries.getEnquiryDetails';
import getOpportunityDetails from '@salesforce/apex/GetMyEnquiries.getOpportunityDetails';

export default class CpJourneyStageContainer extends LightningElement {

    @api currentStage;
    @api enquiryId;
    @api contactId;
    @api offers = [];
    enquiry;
    opportunity;
    
    connectedCallback() {
        this.getEnquiryInfo();
        this.loadOpportunity();
    }

    get showDocumentSection() {
        return this.currentStage === 'Submitted';
    }

    get showVisitSection() {
        return this.currentStage === 'Site Visit';
    }

    get showEOISection() {
        return this.currentStage === 'Expression of Interest';
    }

    get showUnitsSection() {
        return this.currentStage === 'Unit Selection'
    }

    get showPaymentPlanSection() {
        return this.currentStage === 'Payment Plan selection';
    }
    
    get showSpaSection() {
        return this.currentStage === 'SPA Signature';
    }

    get showPaymentCompletionSection() {
        return this.currentStage === 'Payment Completion';
    }

    @api async getEnquiryInfo() {
        try {
            console.log('Fetching enquiry details from getEnquiryInfo(): ', this.enquiryId);
            this.enquiry = await getEnquiryDetails({ enquiryId: this.enquiryId });
            console.log('Enquiry Details: ', JSON.stringify(this.enquiry, null, 4));
        } catch(error) {
            console.error('Error fetching enquiry details: ', error);
        }
    }

    async loadOpportunity() {

        this.opportunity = await getOpportunityDetails({
            enquiryId: this.enquiryId
        });

        console.log('Opportunity:', JSON.stringify(this.opportunity));
    }
}