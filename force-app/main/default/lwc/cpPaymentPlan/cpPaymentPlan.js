import { LightningElement, api, track } from 'lwc';
import getOffers from '@salesforce/apex/CpPaymentPlanController.getOffers';
import getPaymentPlans from '@salesforce/apex/CpPaymentPlanController.getPaymentPlans';
import updateOfferWithPaymentPlan from '@salesforce/apex/CpPaymentPlanController.updateOfferWithPaymentPlan';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

export default class CpPaymentPlan extends LightningElement {

    @api enquiryId;

    @track offersDetails = [];  // rendered offer cards
    @track paymentPlans = [];   // rendered plan cards for active offer

    // Core state map: { offerId: { selectedPlanId, plans[] } }
    offerConfigMap = {};
    selectedOfferId = null;
    isLoadingOffers = false;
    isLoadingPlans = false;

    // ─── Lifecycle ────────────────────────────────────────────────

    connectedCallback() {
        this.loadOffers();
    }

    // ─── Data Fetching ────────────────────────────────────────────

    async loadOffers() {
        try {
            this.isLoadingOffers = true;
            const raw = await getOffers({ enquiryId: this.enquiryId });

            // Initialize config map — one entry per offer
            const map = {};
            (raw || []).forEach(o => {
                map[o.Id] = {
                    selectedPlanId: null,
                    plans: []               // cached once loaded
                };
            });
            this.offerConfigMap = map;

            // Set initial render state — nothing selected yet
            this.offersDetails = (raw || []).map(o => ({
                ...o,
                cardClass: 'unit-card',
                isChecked: false,
                selectedPlanName: null
            }));

        } catch (error) {
            console.error('Error fetching offers: ', error);
        } finally {
            this.isLoadingOffers = false;
        }
    }

    loadPlansForOffer(offerId) {
        const config = this.offerConfigMap[offerId];
        if (!config) return;

        // Already cached — just restore decorated state
        if (config.plans.length > 0) {
            this.paymentPlans = config.plans;
            this.decoratePaymentPlans();
            return;
        }

        const offer = this.offersDetails.find(o => o.Id === offerId);
        if (!offer) return;

        this.isLoadingPlans = true;

        getPaymentPlans({ unitId: offer.Unit__c })
            .then(result => {
                const formatted = (result || []).map(plan => ({
                    Id: plan.Id,
                    Name: plan.Name,
                    cardClass: 'payment-card',
                    isChecked: false,
                    hasItems: (plan.Template_Items1__r || []).length > 0,
                    items: (plan.Template_Items1__r || []).map(item => ({
                        Id: item.Id,
                        name: item.Payment_Item_Master__r ? item.Payment_Item_Master__r.Name : '',
                        itemName: item.Item_Name__r ? item.Item_Name__r.Name : '',
                        percentage: item.Percentage__c != null ? item.Percentage__c : '',
                        milestoneName: item.Milestone__r ? item.Milestone__r.Name : '',
                        tentativeDueDate: item.Tentative_Due_Date__c
                            ? this._formatDate(item.Tentative_Due_Date__c)
                            : (item.Payment_Based_On__c || '')
                    }))
                }));

                // Cache in config map
                this.offerConfigMap = {
                    ...this.offerConfigMap,
                    [offerId]: {
                        ...this.offerConfigMap[offerId],
                        plans: formatted
                    }
                };

                this.paymentPlans = formatted;
                this.decoratePaymentPlans();
            })
            .catch(error => {
                console.error('Error fetching payment plans: ', error);
            })
            .finally(() => {
                this.isLoadingPlans = false;
            });
    }

    // ─── Event Handlers ───────────────────────────────────────────

    handleOfferSelect(event) {
        const offerId = event.currentTarget.dataset.id;
        if (this.selectedOfferId === offerId) return;

        this.selectedOfferId = offerId;
        this.decorateOffers();
        this.loadPlansForOffer(offerId);
    }

    handlePlanSelect(event) {
        const planId = event.currentTarget.dataset.planId;
        const offerId = this.selectedOfferId;
        if (!offerId) return;

        const config = this.offerConfigMap[offerId];
        const current = config.selectedPlanId;

        // Toggle: clicking selected plan deselects it
        this.offerConfigMap = {
            ...this.offerConfigMap,
            [offerId]: {
                ...config,
                selectedPlanId: current === planId ? null : planId
            }
        };

        this.decoratePaymentPlans();
        this.decorateOffers();          // updates checkbox + chip on offer card
    }

    async handleConfirm() {
        const selections = Object.entries(this.offerConfigMap)
            .filter(([, config]) => config.selectedPlanId)
            .map(([offerId, config]) => ({
                offerId,
                planId: config.selectedPlanId
            }));

        try {
            await updateOfferWithPaymentPlan({ 
                selections: JSON.stringify(selections) 
            });

            this.dispatchEvent(new ShowToastEvent({
                title: 'Success',
                message: 'Payment plans updated successfully',
                variant: 'success'
            }));

            this.dispatchEvent(new CustomEvent('planselected', {
                detail: { selections },
                bubbles: true,
                composed: true
            }));

        } catch (error) {
            console.error('Error updating payment plans: ', error);
            this.dispatchEvent(new ShowToastEvent({
                title: 'Error',
                message: 'Failed to update payment plans. Please try again.',
                variant: 'error'
            }));
        }
    }

    // ─── Decorate Methods (same pattern as OfferConfiguration) ────

    decorateOffers() {
        this.offersDetails = this.offersDetails.map(o => {
            const config = this.offerConfigMap[o.Id];
            const hasSelection = !!(config && config.selectedPlanId);
            const selectedPlanName = hasSelection
                ? this._getPlanName(o.Id, config)
                : null;

            return {
                ...o,
                cardClass: o.Id === this.selectedOfferId
                    ? 'unit-card selected'
                    : 'unit-card',
                isChecked: hasSelection,        // checkbox ticked only when plan is selected
                selectedPlanName                // chip text
            };
        });
    }

    decoratePaymentPlans() {
        const config = this.offerConfigMap[this.selectedOfferId];
        if (!config) return;

        const selectedPlanId = config.selectedPlanId;

        this.paymentPlans = this.paymentPlans.map(plan => ({
            ...plan,
            cardClass: plan.Id === selectedPlanId
                ? 'payment-card selected'
                : 'payment-card',
            isChecked: plan.Id === selectedPlanId
        }));
    }

    // ─── Getters ──────────────────────────────────────────────────

    get noOffers() {
        return !this.isLoadingOffers && this.offersDetails.length === 0;
    }

    get activeOfferName() {
        if (!this.selectedOfferId) return null;
        const offer = this.offersDetails.find(o => o.Id === this.selectedOfferId);
        return offer ? offer.Unit__r.Name : null;
    }

    get noPlans() {
        return (
            !this.isLoadingPlans &&
            !!this.selectedOfferId &&
            this.paymentPlans.length === 0
        );
    }

    // Confirm is disabled until EVERY offer has a plan selected
    get isConfirmDisabled() {
        const offerIds = Object.keys(this.offerConfigMap);
        if (offerIds.length === 0) return true;
        return offerIds.some(id => !this.offerConfigMap[id].selectedPlanId);
    }

    // ─── Private Helpers ──────────────────────────────────────────

    _getPlanName(offerId, config) {
        const plan = (config.plans || []).find(p => p.Id === config.selectedPlanId);
        return plan ? plan.Name : null;
    }

    _formatDate(dateStr) {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        return (d.getMonth() + 1) + '/' + d.getDate() + '/' + d.getFullYear();
    }
}