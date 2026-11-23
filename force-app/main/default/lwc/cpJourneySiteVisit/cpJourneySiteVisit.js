import { LightningElement,api } from 'lwc';

export default class CpJourneySiteVisit extends LightningElement {

    @api leadId;

    handleComplete() {
        // simple test action
        console.log('Site Visit completed for Lead:', this.leadId);

        // optional: fire event to parent
        this.dispatchEvent(
            new CustomEvent('stagenext', {
                detail: {
                    stage: 'SiteVisitCompleted'
                }
            })
        );
    }

}