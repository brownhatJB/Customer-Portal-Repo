import { LightningElement,api ,wire } from 'lwc';
import getReceipts from '@salesforce/apex/CpPurchaseController.getReceipts';

export default class CpUslReceipts extends LightningElement {

    @api uslId;

    columns = [];
    receipts = [];

    @wire(getReceipts, { uslId: '$uslId' })
    wiredReceipts({ data, error }) {
        console.log('Received unit sale id:', this.uslId);
        if (data) {

            this.columns = data.columns;

            this.receipts = data.records.map(row => {

                let values = [];

                this.columns.forEach(col => {

                    values.push({
                        field: col.fieldPath,
                        value: row[col.fieldPath]
                    });
                });

                return {
                    Id: row.Id,
                    values: values
                };
            });
        }

        if (error) {
            console.error(error);
        }
    }
}