import { LightningElement, api, track, wire } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import getOffersFromOpportunity from '@salesforce/apex/CpGenerateInovoicesController.getOffersFromOpportunity';
import getOfferPaymentPlanItems from '@salesforce/apex/CpGenerateInovoicesController.getOfferPaymentPlanItems';
import generateInvoicesFromOpportunity from '@salesforce/apex/CpGenerateInovoicesController.generateInvoicesFromOpportunity';
import createReceipt from '@salesforce/apex/CpGenerateInovoicesController.createReceipt';

// Statuses that DO NOT get a Pay button
const NON_PAYABLE_STATUSES = ['Received', 'Not Invoiced', ''];
const MODE_OPTIONS = [
    { label: 'Bank Transfer', value: 'Bank Transfer'},
    { label: 'Card', value: 'Card'},
    { label: 'Wire Transfer', Value: 'Wire Transfer'}
];

export default class CpPaymentCompletion extends LightningElement {

    @api recordId; // opportunity
    @api invoiceGenerated;

    @track offersDetails = [];
    @track paymentPlanItems = [];
    @track selectedOfferId = null;
    @track activeOfferName = '';

    isGeneratingInvoices = false;
    isLoadingOffers = false;
    isLoadingItems  = false;
    isPaymentProgress = false;

    modeOptions = MODE_OPTIONS;
    selectedPPI;
    selectedPaymentMode;
    txnNumber;
    showPayModal = false;


    // ─── Lifecycle ───────────────────────────────────────────────────────────

    connectedCallback() {
        this.loadOffers();
    }

    // ─── Data loading ─────────────────────────────────────────────────────────

    loadOffers() {
        if (!this.recordId) return;
        this.isLoadingOffers = true;

        getOffersFromOpportunity({ oppId: this.recordId })
            .then(data => {
                this.offersDetails = data.map(offer => ({
                    ...offer,
                    cardClass:        'unit-card',
                    paymentStatus:    '',
                    statusBadgeClass: 'status-badge'
                }));
            })
            .catch(error => {
                this.showToast('Error', error.body?.message || 'Failed to load offers', 'error');
            })
            .finally(() => {
                this.isLoadingOffers = false;
            });
    }

    loadPaymentPlanItems(offerId) {
        this.isLoadingItems = true;
        this.paymentPlanItems = [];

        getOfferPaymentPlanItems({ offerId })
            .then(data => {
                this.paymentPlanItems = data.map(item => ({
                    ...item,
                    showPayButton:  !NON_PAYABLE_STATUSES.includes(item.Status__c),
                    statusPillClass: this.resolveStatusPillClass(item.Status__c)
                }));
            })
            .catch(error => {
                this.showToast('Error', error.body?.message || 'Failed to load payment items', 'error');
            })
            .finally(() => {
                this.isLoadingItems = false;
            });
    }

    // ─── Handlers ─────────────────────────────────────────────────────────────

    handleOfferSelect(event) {
        const offerId = event.currentTarget.dataset.id;
        if (this.selectedOfferId === offerId) return;

        this.selectedOfferId = offerId;

        // Update card highlight
        this.offersDetails = this.offersDetails.map(offer => ({
            ...offer,
            cardClass: offer.Id === offerId ? 'unit-card selected' : 'unit-card'
        }));

        const selected = this.offersDetails.find(o => o.Id === offerId);
        this.activeOfferName = selected ? selected.Name : '';

        this.loadPaymentPlanItems(offerId);
    }

    async handlePay() {
        const itemId = this.selectedPPI;
        console.log('PPI Id: ', itemId);

        if(this.isPaymentProgress) return;
        this.isPaymentProgress = true;

        try {
            await createReceipt({ PPItemId : itemId, mode: this.selectedPaymentMode, txnNo: this.txnNumber });
            this.dispatchEvent(new ShowToastEvent({
                    title: 'Thank You',
                    message: `Payment Succesful`,
                    variant: 'success'
                }));

            window.location.reload();
        } catch(error) {
            console.log('Error while creating receipts', error);

            this.dispatchEvent(new ShowToastEvent({
                title: 'Payment Failed',
                message: 'Something went wrong. Try again later',
                variant: 'error'
            }));

            this.isPaymentProgress = false;
        }
    }

    async handleGenerateInvoices() {
        try{
            this.isGeneratingInvoices = true;
            await generateInvoicesFromOpportunity({ oppId : this.recordId}); 
            this.invoiceGenerated = true;
        } catch(error) {
            console.log('error while generating invoices', error);
        }
    }
    // ─── Computed ─────────────────────────────────────────────────────────────

    get noOffers() {
        return !this.isLoadingOffers && this.offersDetails.length === 0;
    }

    get hasItems() {
        return this.paymentPlanItems.length > 0;
    }

    get showPayments() {
        return this.invoiceGenerated;
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    resolveStatusPillClass(status) {
        const base = 'status-pill ';
        switch (status) {
            case 'Received':     return base + 'pill-received';
            case 'Not Invoiced': return base + 'pill-not-invoiced';
            case 'Overdue':      return base + 'pill-overdue';
            case 'Invoiced':     return base + 'pill-invoiced';
            default:             return base + 'pill-default';
        }
    }

    showToast(title, message, variant) {
        this.dispatchEvent(new ShowToastEvent({ title, message, variant }));
    }

    //handlers
    handlePaymentMode(event) {
        this.selectedPaymentMode = event.detail.value;
    }

    handletxnNumber(event) {
        this.txnNumber = event.detail.value;
    }

    openPayModal(event) {
        this.showPayModal = true;
        this.selectedPPI = event.currentTarget.dataset.id;
    }

    closePayModal() {
        this.showPayModal = false;
        this.selectedPaymentMode = '';
        this.txnNumber = '';
        this.selectedPPI = '';
    }

    get isPayNowDisabled() {
        return this.selectedPaymentMode && this.txnNumber ? false : true;
    }
}