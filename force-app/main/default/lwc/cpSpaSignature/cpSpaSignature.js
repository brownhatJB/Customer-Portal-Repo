import { LightningElement, api, track } from 'lwc';

import getOffersForSPA from '@salesforce/apex/cpSpaSignatureController.getOffersForSPA';
import getSPAByOffers from '@salesforce/apex/cpSpaSignatureController.getSPAByOffers';
import generateSPA from '@salesforce/apex/cpSpaSignatureController.generateSPA';
import markSPACompleted from '@salesforce/apex/cpSpaSignatureController.markSPACompleted';

import { ShowToastEvent } from 'lightning/platformShowToastEvent';

export default class CpSpaSignature extends LightningElement {


    _opportunityId;

    @track offers = [];
    isLoading = false;

    hasLoaded = false;

    @api
    set opportunityId(value) {
        this._opportunityId = value;

        console.log('SPA received opportunityId:', value);

        if (value) {
            this.loadData();
        }
    }

    get opportunityId() {
        return this._opportunityId;
    }

    async loadData() {

        console.log('loadData triggered');

        if (!this._opportunityId) {
            console.warn('Opportunity Id is undefined');
            return;
        }

        this.isLoading = true;

        try {
            const offers = await getOffersForSPA({
                opportunityId: this._opportunityId
            });

            console.log('RAW RESPONSE:', offers);

            const offerIds = (offers || []).map(o => o.Id);

            let docMap = {};

            if (offerIds.length > 0) {
                docMap = await getSPAByOffers({
                    offerIds: offerIds
                });
            }

           this.offers = (offers || []).map(o => {
    const doc = docMap[o.Id];
    return {
        ...o,
        UnitName: o.Unit__r?.Name,
        PlanName: o.Payment_Plan_Template__r?.Name,
        EnquiryNo: o.Originating_Lead__r?.Enquiry_Number__c,

        hasSPA: !!doc,

        spaUrl: doc?.SPA_Public_Link__c || null
    };
});

console.log('Final Offers:', JSON.stringify(this.offers));
} catch (e) {
            console.error('Error loading SPA data:', e);
        }

        this.isLoading = false;
    }

    async handleSpa(event) {

        const offerId = event.target.dataset.id;
        const checked = event.target.checked;

        try {
            await generateSPA({
                offerId: offerId,
                generateSPA: checked
            });

            this.showToast('Success', 'SPA generation in progress. Refresh after a few seconds to preview the document.', 'success');

            // await this.loadData();

        } catch (e) {
            console.error('FULL ERROR:', JSON.stringify(e));

    this.showToast(
        'Error',
        e.body?.message || 'SPA generation failed',
        'error'
    );
        }
    }

    openFile(event) {
    const url = event.target.dataset.url;

    if (url) {
        window.open(url, '_blank');
    }
}

    showToast(title, message, variant) {
        this.dispatchEvent(
            new ShowToastEvent({
                title,
                message,
                variant
            })
        );
    }

    get noOffers() {
        return !this.isLoading && this.offers.length === 0;
    }

    get allSpaGenerated() {
    return this.offers.length > 0 &&
        this.offers.every(o => o.hasSPA);
}

    get isButtonDisabled() {
        return this.allSpaGenerated === false; 
    }

   async handleProceedStage() {
    if (!this.allSpaGenerated) return;

    await markSPACompleted({
        opportunityId: this._opportunityId
    });

    window.location.reload();
}
}