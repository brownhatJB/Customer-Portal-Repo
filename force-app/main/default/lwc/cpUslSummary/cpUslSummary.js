import { LightningElement, api } from 'lwc';
import getUnitSaleInfo from '@salesforce/apex/CpPurchaseController.getUnitSaleInfo';

export default class CpUslSummary extends LightningElement {
    @api uslId;
    usl = [];

    connectedCallback() {
        this.fetchUslInfo();
    }

    async fetchUslInfo() {
        try{
            this.usl = await getUnitSaleInfo({ uslId: this.uslId });
            console.log(JSON.stringify(this.usl, null, 2));
        } catch(error) {
            console.error('error while retrieving usl record: ', error);
        }
    }
}