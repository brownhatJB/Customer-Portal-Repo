import { LightningElement } from 'lwc';

export default class CpJourneys extends LightningElement {

    recievedEnquiryId;
    showJourneyDetail = false;

    connectedCallback() {
        this.handleJourneyUrlChange();

        window.addEventListener('popstate', this.handleJourneyUrlChange.bind(this));
        window.addEventListener('navigatejourneys', this.handleJourneyUrlChange.bind(this));
    }

    disconnectedCallback() {

        window.removeEventListener('popstate', this.handleJourneyUrlChange.bind(this));
        window.removeEventListener('navigatejourneys', this.handleJourneyUrlChange.bind(this));
    }

    handleJourneyUrlChange() {
        const params = new URLSearchParams(window.location.search);

        const enquiryId = params.get('enquiryId');

        console.log('URL changed → enquiryId:', enquiryId);

        if(enquiryId) {
            this.recievedEnquiryId = enquiryId;
            this.showJourneyDetail = true;
        } else {
            this.recievedEnquiryId = null;
            this.showJourneyDetail = false;
        }

    }

    handleEnquiryRecieved(event) {
        this.recievedEnquiryId = event.detail.enqId;
        
        window.history.pushState({}, '', `?enquiryId=${this.recievedEnquiryId}`);

        this.handleJourneyUrlChange();
    }
}