import { LightningElement } from 'lwc';
import getUnitSales from '@salesforce/apex/CpPurchaseController.getUnitSales'

export default class CpPurchasesList extends LightningElement {
    sales = [];

    connectedCallback() {
        this.getUnitSalesInfo();
    }

    async getUnitSalesInfo() {
        try{
            this.sales = await getUnitSales();
        } catch(error) {
            console.error('Error retrieving unit sales', error);
        }
    }

    handleUnitSaleClick(event) {
        const unitSaleId = event.currentTarget.dataset.id;

        const unitSaleClickEvent = new CustomEvent('unitsaleclick', {
            detail: {saleId: unitSaleId}
        });

        this.dispatchEvent(unitSaleClickEvent);
    }
}