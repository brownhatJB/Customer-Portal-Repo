import { LightningElement,api,wire } from 'lwc';
import  getPaymentPlanItems from '@salesforce/apex/CpPurchaseController.getPaymentPlanItems';

export default class CpUslPaymentPlan extends LightningElement {
   @api uslId;
   columns = [];
   paymentPlanItems = [];

    @wire(getPaymentPlanItems, { unitSaleId: '$uslId' })
    wiredItems({ data, error }) {

        if (data) {

            this.columns = data.columns;
            this.paymentPlanItems = data.records.map(row => {

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