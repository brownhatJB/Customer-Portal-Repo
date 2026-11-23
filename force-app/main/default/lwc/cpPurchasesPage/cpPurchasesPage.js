import { LightningElement } from 'lwc';

export default class CpPurchasesPage extends LightningElement {

    receivedUnitSaleId;
    showPurchaseDetail = false;

    connectedCallback() {
        this.handleUnitSaleUrlChange();

        window.addEventListener('popstate', this.handleUnitSaleUrlChange.bind(this));
        window.addEventListener('navigatepurchases', this.handleUnitSaleUrlChange.bind(this));
    }

    disconnectedCallback() {
        window.removeEventListener('popstate', this.handleUnitSaleUrlChange.bind(this));
        window.removeEventListener('navigatepurchases', this.handleUnitSaleUrlChange.bind(this));
    }

    handleUnitSaleUrlChange() {
        const params = new URLSearchParams(window.location.search);

        const saleId = params.get('unitSaleId');

        if(saleId) {
            this.receivedUnitSaleId = saleId;
            this.showPurchaseDetail = true;
        } else {
            this.receivedUnitSaleId = null;
            this.showPurchaseDetail = false;
        }
    }

    handlUnitSaleNav(event) {
        const saleId = event.detail.saleId;
        
        window.history.pushState({}, '', `?unitSaleId=${saleId}`);

        this.handleUnitSaleUrlChange();
    }
}