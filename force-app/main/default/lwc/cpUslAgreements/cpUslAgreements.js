import { LightningElement, api } from 'lwc';
import getSpaDocuments from '@salesforce/apex/CpPurchaseController.getSpaDocuments';

const SPA = 'Sales Purchase Agreement';
const COUNTER_SPA = 'Counter Signed SPA';
const SIGNED_SPA = 'Signed SPA';

export default class CpUslAgreements extends LightningElement {
    @api uslId;
    docs = [];
    spaUrl;
    counterSpaUrl;
    signedSpaUrl;
    fileUrl;
    docHeading;

    connectedCallback() {
        this.getSPAs();
    }

    async getSPAs() {
        try {
            this.docs =  await getSpaDocuments({ unitSaleId: this.uslId });
            this.setFileUrl();
        } catch(error) {
            console.error('Error while fetching spa docs: ', error);
        }
    }

    setFileUrl() {
        this.docs.forEach(doc => {
            if(doc.Name__c === SIGNED_SPA && doc.SPA_Public_Link__c) { 
                this.signedSpaUrl = doc.SPA_Public_Link__c;
            } else if(doc.Name__c === COUNTER_SPA && doc.SPA_Public_Link__c) { 
                this.counterSpaUrl = doc.SPA_Public_Link__c;
            } else if(doc.Name__c == SPA && doc.SPA_Public_Link__c) { 
                this.spaUrl = doc.SPA_Public_Link__c;
            }
        });

        if(this.signedSpaUrl) {
            this.fileUrl = this.signedSpaUrl;
            this.docHeading = SIGNED_SPA;
        } else if(this.counterSpaUrl) {
            this.fileUrl = this.counterSpaUrl;
            this.docHeading = COUNTER_SPA;
        } else if(this.spaUrl) {
            this.fileUrl = this.spaUrl;
            this.docHeading = SPA;
        }
    }
}