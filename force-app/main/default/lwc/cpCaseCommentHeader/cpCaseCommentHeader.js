import { LightningElement ,wire} from 'lwc';
import { CurrentPageReference, NavigationMixin } from 'lightning/navigation';
import getCaseDetailforCaseComment from '@salesforce/apex/CasePortalController.getCaseDetailforCaseComment';

export default class CpCaseCommentHeader extends LightningElement {

    recordId;
    caseData;
    error;

    
    @wire(CurrentPageReference)
    getStateParameters(pageRef) {
        if (pageRef) {
            this.recordId = pageRef.state?.recordId;
        }
    }

     handleBack() {
        // this[NavigationMixin.Navigate]({
        //     type: 'comm__namedPage',
        //     attributes: {
        //         name: 'case__c' 
        //     }
        // });
        window.history.back();
    }

    //  Fetch case details
    @wire(getCaseDetailforCaseComment, { caseId: '$recordId' })
    wiredCase({ data, error }) {
        if (data) {
            this.caseData = data;
            this.error = undefined;
        } else if (error) {
            this.error = error;
            this.caseData = undefined;
        }
    }

    //  Status styling
    get statusClass() {
        const status = this.caseData?.Status;

        if (status === 'Escalated') return 'badge resolved';
        if (status === 'New'  || status === 'Working') return 'badge progress';
        return 'badge open';
    }

    //  Format dates
    get createdDate() {
    return this.caseData?.CreatedDate
        ? new Date(this.caseData.CreatedDate).toLocaleString()
        : '';
}

get updatedDate() {
    return this.caseData?.LastModifiedDate
        ? new Date(this.caseData.LastModifiedDate).toLocaleString()
        : '';
}
}