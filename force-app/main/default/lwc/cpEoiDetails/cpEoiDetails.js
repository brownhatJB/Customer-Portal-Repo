import { LightningElement, api } from 'lwc';
import getEOIDetails from '@salesforce/apex/CpEoiPortalController.getEOIDetails';
import createPaymentLinkForEoi from '@salesforce/apex/RazorpayPaymentController.createPaymentLinkForEoi';
import markProfileForEoi from '@salesforce/apex/CpEoiPortalController.markProfileForEoi';
import createCommunityUser from '@salesforce/apex/CpEoiPortalController.createCommunityUser';
import acceptAllocatedUnit from '@salesforce/apex/CpEoiPortalController.acceptAllocatedUnit';
import rejectAllocatedUnit from '@salesforce/apex/CpEoiPortalController.rejectAllocatedUnit';


export default class CpEoiDetails extends LightningElement {

    @api eoiId;

    eoi;
    isLoading = true;
    error;
    paymentLinkLoading = false;
    isAcceptingUnit = false;
    isRejectingUnit = false;

    get showAllocatedUnit() {
    return !!this.eoi?.allocatedUnitName;
    }

    connectedCallback() {
        this.loadEOI();
    }

    loadEOI() {
        if (!this.eoiId) {
            this.error = 'EOI Id is missing.';
            this.isLoading = false;
            return;
        }

        getEOIDetails({
            eoiId: this.eoiId
        })
        .then(async result => {
            this.eoi = result;
            this.error = undefined;

           if (this.eoi.status === 'Received') {

            await markProfileForEoi({
                eoiId: this.eoiId
            });

            console.log('markProfileForEoi completed.');

            setTimeout(async () => {
                try {
                    await createCommunityUser({
                        eoiId: this.eoiId
                    });

                    console.log('Community user created successfully.');

                } catch (error) {
                    console.error(
                        'Community user creation error:',
                        JSON.stringify(error)
                    );
                }
            }, 5000);
        }
        })
        .catch(error => {
            this.error =
                error?.body?.message ||
                'Unable to load EOI details.';
        })
        .finally(() => {
            this.isLoading = false;
        });
    }

    handleBack() {
        this.dispatchEvent(
            new CustomEvent('back')
        );
    }

    async handlePay() {
        console.log('Initiating payment for EOI ID:', this.eoiId);
        this.paymentLinkLoading = true;
        try {
            const response = await createPaymentLinkForEoi({ eoiId: this.eoiId });
            if (response && response.shortUrl) {
                window.open(response.shortUrl, '_blank');
            }
        } catch (error) { 
            console.error('Error creating payment link:', error);
        } finally {
            this.paymentLinkLoading = false;
        }
    }

    get showPayBtn() {
        return this.eoi && this.eoi.status !== 'Received' &&
        this.eoi.status !== 'Refund Requested' &&
        this.eoi.status !== 'Refund Processed' &&
        this.eoi.status !== 'Cancelled';
    }

    async handleAcceptUnit() {

        this.isAcceptingUnit = true;

        try {
            const opportunityId = await acceptAllocatedUnit({
                eoiId: this.eoiId
            });

            console.log( 'Opportunity created:', opportunityId );

            this.eoi = {
                ...this.eoi,
                unitAccepted: true
            };
        } catch (error) {

            console.error( 'Accept unit error:', error );
            console.error( 'Error message:', error?.body?.message );
            this.error = error?.body?.message ||'Unable to accept the allocated unit.';

        } finally {
            this.isAcceptingUnit = false;
        }
    }

    async handleRejectUnit() {

    this.isRejectingUnit = true;

    try {

        await rejectAllocatedUnit({
            eoiId: this.eoiId
        });

        this.eoi = {
            ...this.eoi,
            unitRejected: true
        };

    } catch (error) {

        console.error('Reject unit error:', error);
        console.error('Reject unit message:', error?.body?.message);

        this.error =
            error?.body?.message ||
            'Unable to reject the allocated unit.';

    } finally {
        this.isRejectingUnit = false;
    }
}

get showAcceptUnitButton() {
    return this.eoi?.allocatedUnitName &&
        !this.eoi?.unitAccepted &&
        !this.eoi?.unitRejected;
}
get showRejectUnitButton() {
     return this.eoi?.allocatedUnitName &&
        !this.eoi?.unitRejected &&
        !this.eoi?.unitAccepted;
}
get showAllocatedBadge() {
    return this.eoi?.unitAccepted === true;
}
get showAllocatedRejectBadge() {
    return this.eoi?.unitRejected === true;
}

get showOfferJourneyMessage() {
    return this.eoi?.unitAccepted === true;
}

handleGoToJourneys() {
       window.location.href = `/mdrealty/journeys?enquiryId=${this.eoi.enqId}`;
}
}