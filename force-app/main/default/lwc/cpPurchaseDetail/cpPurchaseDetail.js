import { LightningElement, api } from 'lwc';

const NAV_ITEMS = [
        { id: 'summary',    label: 'Summary'},
        { id: 'payment plan',  label: 'Payment Plan' },
        { id: 'invoices',  label: 'Invoices'},
        { id: 'receipts',     label: 'Receipts' },
        { id: 'agreements', label: 'Agreements'},
    ];

export default class CpPurchaseDetail extends LightningElement {
    @api unitSaleId;

    activeTab = 'summary';

    get navItems() {
        return NAV_ITEMS.map(item => ({
            ...item,
            cssClass: `nav-btn${this.activeTab === item.id ? ' active' : ''}`
        }));
    }

    handleNavClick(event) {
        this.activeTab = event.currentTarget.dataset.id;
    }

    get isSummary() {
        return this.activeTab === 'summary';
    }

    get isPaymentPlan() {
        return this.activeTab === 'payment plan';
    }

    get isInvoices() {
        return this.activeTab === 'invoices';
    }

    get isReceipts() {
        return this.activeTab === 'receipts';
    }

    get isAgreements() {
        return this.activeTab === 'agreements';
    }

    handleBackToPurchases() {
        window.history.pushState({}, '', '/mdrealty/purchases');

        window.dispatchEvent(new Event('navigatepurchases'));
    }
}