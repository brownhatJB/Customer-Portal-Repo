import { LightningElement, api, wire } from 'lwc';
import getLeadEOI from '@salesforce/apex/GetMyEnquiries.getLeadEOI';
import updateEOIFlag from '@salesforce/apex/GetMyEnquiries.updateEOIFlag';

export default class CpEOI extends LightningElement {

    @api recordId;
    leadRecord;
    eoiValue = '';
    isLoadingUnits = false;

    connectedCallback() {
        this.getLeadDetails();
    }

    async getLeadDetails() {
        try {
            const result = await getLeadEOI({leadId: this.recordId});
            this.leadRecord = result;
            this.eoiValue = this.leadRecord.Expression_Of_Interest_Flag__c ? this.leadRecord.Expression_Of_Interest_Flag__c : '';
            console.log(JSON.stringify(this.leadRecord, null, 4));
            console.log(this.eoiValue);
        } catch (error) {
            console.error('error fetching enquiry detials (EOI flag)', error);
        }
    }

    get showFirstScreen() {
        return this.eoiValue === '';
    }

    get showInterestedScreen() {
        return this.eoiValue === 'Interested';
    }

    get showNotInterestedScreen() {
        return this.eoiValue === 'Not Interested';
    }

    async handleInterestBtn() {
        try {
            await updateEOIFlag({leadId: this.recordId, eoiFlag: 'Interested'});
            this.eoiValue = 'Interested';
        } catch (error) {
            console.error('Error updating EOI flag', error);
        }
    }

    async handleNotInterestBtn() {
        try {
            await updateEOIFlag({leadId: this.recordId, eoiFlag: 'Not Interested'});
            this.eoiValue = 'Not Interested';
        } catch (error) {
            console.error('Error updating EOI flag', error);
        }
    }

    handleViewUnits() {
        this.isLoadingUnits = true;
        const navigateEvent = new CustomEvent('lead2opp', {
            detail: { leadId: this.recordId },
            bubbles: true,
            composed: true
        });
        this.dispatchEvent(navigateEvent);
    }
}