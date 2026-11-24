/*******************************************************
 * File: CpPurchaseController.cls
 * Author: JOUHAR C (jouhar@metadatacorp.com)
 * Date: 19-05-2026
 * Description: This class is used for retrieving the data of each customer's unit_sale details.
 * Last Modified By: JOUHAR C
 * Last Modified Date: 
 *******************************************************/

public without sharing class CpPurchaseController {
    
    @AuraEnabled(cacheable=true) 
    public static List<Unit_Sale__c> getUnitSales() {
        User u = [
            SELECT ContactId
            FROM User
            WHERE Id =: UserInfo.getUserId()
        ];
        
        try {
            List<Unit_Sale__c> sales = [
                SELECT Id, Name,
                    Project__r.Name,
                    Unit__r.Name,
                    Status__c,
                    Unit_Price__c,
                    CreatedDate
                FROM Unit_Sale__c
                WHERE Primary_Contact__c =: u.ContactId
            ];

            return sales;
        } catch(Exception e) {
            throw new AuraHandledException('Error while fetching unit sales details: ' + e.getMessage());
        } 
    }

    @AuraEnabled(cacheable=true)
    public static Unit_Sale__c getUnitSaleInfo(String uslId) {
        
        if(String.isBlank(uslId)) {
            throw new AuraHandledException('Unit Sale record Id is required');
        }

        try {
            Unit_Sale__c usl = [ 
                SELECT Id, Name, Project__r.Name, Unit__r.Name, 
                    Status__c, Unit_Price__c, CreatedDate, Total_deal_value__c,
                    Discount__c, Tax_Value__c, Received_Amount__c, Property__r.Name,
                    SPA_Signed__c, RA_Signed__c, Offer__r.Name, Payment_Plan_Template__r.Name, 
                    Sale_Through__c, Broker_Account__r.Name, Broker_Agent__r.Name, Unit__r.Floor__c,
                    Unit__r.Bedrooms__c, Unit__r.Bathrooms__c, Unit__r.Total_Area__c, Sale_Registered_Date__c 
                FROM 
                    Unit_Sale__c 
                WHERE Id =: uslId
            ];

            return usl;
        } catch(Exception e) {
            throw new AuraHandledException('Error while fetching Unit Sale record: ' + e.getMessage());
        }
    }


    @AuraEnabled(cacheable=true)
    public static Map<String, Object> getPaymentPlanItems(String unitSaleId) {

        List<String> fields = new List<String>();
        List<Map<String,String>> columns = new List<Map<String,String>>();

        for (Schema.FieldSetMember f :
            Schema.SObjectType.Payment_Plan_Item__c
            .FieldSets.Portal_Purchase_PPI_Table
            .getFields()) {

            fields.add(f.getFieldPath());

            columns.add(new Map<String,String>{
                'label' => f.getLabel(),
                'fieldPath' => f.getFieldPath()
            });
        }

        String query =
            'SELECT Id,' + String.join(fields, ',') +
            ' FROM Payment_Plan_Item__c' +
            ' WHERE Unit_Sale__c = :unitSaleId';

        return new Map<String, Object>{
            'columns' => columns,
            'records' => Database.query(query)
        };
    }

    @AuraEnabled(cacheable=true)
    public static Map<String, Object> getReceipts(String uslId) {

        List<String> fields = new List<String>();
        List<Map<String,String>> columns = new List<Map<String,String>>();

        for (
            Schema.FieldSetMember f :
            Schema.SObjectType.Receipt__c
                .FieldSets.Portal_Journey_Receipt_Table
                .getFields()
        ) {

            fields.add(f.getFieldPath());

            columns.add(new Map<String,String>{
                'label' => f.getLabel(),
                'fieldPath' => f.getFieldPath()
            });
        }

        String query =
            'SELECT Id,' + String.join(fields, ',') +
            ' FROM Receipt__c' +
            ' WHERE Unit_Sale__c = :uslId';

        return new Map<String, Object>{
            'columns' => columns,
            'records' => Database.query(query)
        };
    }

    @AuraEnabled(cacheable=true)
    public static Map<String, Object> getInvoices(String uslId) {

        List<String> fields = new List<String>();
        List<Map<String,String>> columns = new List<Map<String,String>>();

        try {
            for (
                Schema.FieldSetMember f :
                Schema.SObjectType.Invoice__c
                    .FieldSets.CP_Purchase_Invoice_Table
                    .getFields()
            ) {

                fields.add(f.getFieldPath());

                columns.add(new Map<String,String>{
                    'label' => f.getLabel(),
                    'fieldPath' => f.getFieldPath()
                });
            }

            String query =
                'SELECT Id,' + String.join(fields, ',') +
                ' FROM Invoice__c' +
                ' WHERE Unit_Sale__c = :uslId';

            return new Map<String, Object>{
                'columns' => columns,
                'records' => Database.query(query)
            };

        } catch(Exception e) {
            throw new AuraHandledException('Error while fetching invoices: ' + e.getMessage());
        }
    }

    @AuraEnabled(cacheable=true)
    public static List<Document__c> getSpaDocuments(String unitSaleId) {

        if(String.isBlank(unitSaleId)) {
            throw new AuraHandledException('unitSaleId is required');
        }

        try {
            Unit_Sale__c usl = [ SELECT Id, Name, Offer__c FROM Unit_Sale__c WHERE Id = :unitSaleId ];

            List<Document__c> docs = [ 
                SELECT 
                    Id, Name__c,  Offer__c, SPA_Public_URL__c, SPA_Public_Link__c 
                FROM 
                    Document__c 
                WHERE 
                    Offer__c =: usl.Offer__c 
            ];
            return docs;
        } catch(Exception e) {
            throw new AuraHandledException('Error while retrieving purchase agreement docs: ' + e.getMessage());
        }
    }
}