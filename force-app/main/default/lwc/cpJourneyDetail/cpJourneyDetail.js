import { LightningElement, api, wire } from 'lwc';
import getEnquiryDetails from '@salesforce/apex/GetMyEnquiries.getEnquiryDetails';
import createOpportunityFromLead from '@salesforce/apex/GetMyEnquiries.createOpportunityFromLead';

export default class CpJourneyDetail extends LightningElement {

    @api enquiryId;
    selectedEnquiry;
    stage;
    offers = [];


    @wire(getEnquiryDetails, { enquiryId : '$enquiryId'})
    wiredLead({ data, error }) {
        if(data) {
            this.selectedEnquiry = data;
            console.log(JSON.stringify(this.selectedEnquiry));
        } else {
            console.error('Error: ', error);
        }
    }

    handleBackToEnq() {
        console.log('inside handleBackToEnq');
        window.history.pushState({}, '', '/mdrealty/journeys');

        window.dispatchEvent(new Event('navigatejourneys'));
    }

    handleEnquiryStage(event) {
        const currentStage = event.detail.stage;
        this.stage = currentStage;
        console.log('Current Stage from Left Panel: ', currentStage);
    }

    async handleLeadToOpp(event) {
        const leadId = event.detail.leadId;

        try {
            await createOpportunityFromLead({ leadId });

            setTimeout(() => {
                const leftPanel = this.template.querySelector('c-cp-journey-left-panel');
                if(leftPanel) {
                    leftPanel.getLeadJourneyStage();
                }
            }, 300)
        } catch (error) {
            console.error('Error creating opportunity from lead', error);
        }
    }

    handleOfferCreated(event) {
        this.offers = event.detail.offerIds;

        setTimeout(() => {
            const leftPanel = this.template.querySelector('c-cp-journey-left-panel');
            if(leftPanel) {
                leftPanel.getLeadJourneyStage();
            }
        }, 300);
    }

    handlePaymentPlans(event) {
        const selections = event.detail.selections;
        
         setTimeout(() => {
            const leftPanel = this.template.querySelector('c-cp-journey-left-panel');
            if(leftPanel) {
                leftPanel.getLeadJourneyStage();
            }
        }, 300);
    }
        
}