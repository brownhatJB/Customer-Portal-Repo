import { LightningElement, api, track, wire } from 'lwc';
import getEnquiryJourneyStage from '@salesforce/apex/GetMyEnquiries.getEnquiryJourneyStage';
import getLeadJourneyStage from '@salesforce/apex/GetMyEnquiries.getLeadJourneyStage';

export default class CpJourneyLeftPanel extends LightningElement {


    @track stagesList = [];
    @track stages = [];
    @track currentStage;
    @track error;

    @api leadRecordId;
    leadRecord;

    @track isSiteVisit = false;
    @track isKyc = false;
    @track isAgreement = false;
    @track isRegistration = false;
    @track isHandover = false;

    connectedCallback() {
        this.getLeadJourneyStage();
    }
    // @api
    // set leadRecord(value) {
    //     this._leadRecord = value;

    //     if (value && this.stagesList.length) {
    //         this.currentStage = value.Stage__c;
    //         this.build(this.stagesList);
    //     }
    // }

    // get leadRecord() {
    //     return this._leadRecord;
    // }

    processJourneyhelper() {

        if (this.currentStage && this.stagesList.length > 0) {
            console.log(' Building Journey UI', );
            this.build(this.stagesList);
        }
    }

    @api async getLeadJourneyStage() {
        try {
            this.leadRecord  = await getLeadJourneyStage({ leadId: this.leadRecordId });
            this.currentStage = this.leadRecord.Stage__c;
            console.log(' Lead Stage found :', JSON.stringify(this.currentStage));
            this.setActiveComponent(this.currentStage);
            this.processJourneyhelper();
            this.publishCurrentStage(this.currentStage);
        } catch (error) {
            console.error('Error fetching lead journey stage', error);
        }
    }

    // @wire(getLeadJourneyStage, { leadId: '$leadRecordId' })
    // wiredLead({ data }) {
    //     if (data) {
    //         this.leadRecord = data;
    //         this.currentStage = data.Stage__c;
    //         console.log(' Lead Stage found :', JSON.stringify(this.currentStage));
    //         this.setActiveComponent(this.currentStage);
    //         this.processJourneyhelper();
    //         this.publishCurrentStage(this.currentStage);
    //     }
    // }

    @wire(getEnquiryJourneyStage)
    wiredStages({ data, error }) {

        if (data) {
             console.log(' Journey Stages :', JSON.stringify(data));
            this.stagesList = data;

            if (this.currentStage) {
                console.log(' Stage found :', JSON.stringify(this.currentStage));
                this.build(this.stagesList);
                this.processJourneyhelper();
            }
        }

        if (error) {
            this.error = error;
        }
    }

    //  BUILD STEPPER UI
    build(list) {

        const currentIndex = list.findIndex(
            s => s.value === this.currentStage
        );

        this.stages = list.map((stage, index) => {

            let status = 'disabled';

            if (index < currentIndex) status = 'completed';
            else if (index === currentIndex) status = 'active';

            return {
                ...stage,
                isLast: index === list.length - 1,
                circleClass: `circle ${status}`,
                lineClass: index < currentIndex ? 'line completed-line' : 'line'
              
            };
        });

        this.setActiveComponent(this.currentStage);
    }

    // ROUTING
    setActiveComponent(stage) {

        this.isSiteVisit = false;
        this.isKyc = false;
        this.isAgreement = false;
        this.isRegistration = false;
        this.isHandover = false;

        if (stage === 'Site Visit') {
            this.isSiteVisit = true;
        } else if (stage === 'Submitted') {
            this.isKyc = true;
        } else if (stage === 'Expression of Interest') {
            this.isAgreement = true;
        } else if (stage === 'Unit Selection') {
            this.isRegistration = true;
        } else if (stage === 'Payment Plan selection') {
            this.isHandover = true;
        }
        else if (stage === 'SPA Signature') {
            this.isHandover = true;
        }
        else if (stage === 'Payment Completion') {
            this.isHandover = true;
        }
    }

    //publish event to notify parent component
    publishCurrentStage(currentStage) {
        const stageEvent = new CustomEvent('stageevent', {
            detail: { stage: currentStage }
        });
        this.dispatchEvent(stageEvent);
    }
}