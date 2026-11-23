import { LightningElement, wire } from 'lwc';
import getMyEnquiries from '@salesforce/apex/GetMyEnquiries.getMyEnquiries';

export default class CpJourneysList extends LightningElement {
    enquiries = [];

    @wire(getMyEnquiries)
    wiredLeads({ data, error}) {
        if(data) {
            this.enquiries = data;
        }
        if(error) {
            console.error(error);
        }
    }

    handleEnquiryClick(event) {
        const enquiryId = event.currentTarget.dataset.id;

        console.log('Clicked enquiry ID: ', enquiryId);

        const enquiryClickEvent = new CustomEvent('enquiryclick', { 
            detail: {enqId: enquiryId}
        });

        this.dispatchEvent(enquiryClickEvent);
    }
}