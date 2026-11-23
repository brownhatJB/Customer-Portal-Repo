import { LightningElement, api, wire } from 'lwc';
import getInvoices from '@salesforce/apex/CpPurchaseController.getInvoices';

export default class CpUslInvoics extends LightningElement {

    @api uslId;

    columns = [];
    invoices = [];

    @wire(getInvoices, { uslId: '$uslId' })
    wiredInvoices({ data, error }) {

        if (data) {

            this.columns = data.columns;

            this.invoices = data.records.map(row => {

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

            console.log(JSON.stringify(this.invoices, null, 2));
        }

        if (error) {
            console.error(error);
        }
    }
}