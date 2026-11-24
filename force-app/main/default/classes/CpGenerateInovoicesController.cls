public without sharing class CpGenerateInovoicesController {
    
    @AuraEnabled
    public static void generateInvoicesFromOpportunity(String oppId) {

        if(String.isBlank(oppId)) {
            throw new AuraHandledException('Opportunity Id is required');
        }

        try {
            List<Offer__c> offerIds = [SELECT Id FROM Offer__c WHERE Generate_Offer_Payment_Plan__c = true AND Opportunity__c =: oppId];

            List<Offer_Payment_Plan_Item__c> offerPPIList = [
                SELECT Id, Offer__r.Account__c, Offer__c, Offer__r.Contact__c, Tentative_Due_Date__c, Amount__c, Milestone__c,
                       Offer__r.Project__c, Offer__r.property_id__c, Tax_Amount__c, Amount_Excl_Tax__c, Unit__c 
                FROM 
                       Offer_Payment_Plan_Item__c  
                WHERE 
                       Offer__c 
                IN: offerIds
                AND
                Invoiced__c = false 
            ];

            createInvoices(offerPPIList);
            updateBulkInvoiceGeneratedFlag(oppId);

        } catch(Exception e) {
            throw new AuraHandledException('Error creating while inovoices for offers: ' + e.getMessage());
        }
    }

    public static void createInvoices(List<Offer_Payment_Plan_Item__c> offerPPIs) {

        if(offerPPIs == null || offerPPIs.isEmpty()) {
            throw new AuraHandledException('offerPPIs can\'t be empty');
        }

        try {
            List<Invoice__c> invoiceList = new List<Invoice__c>();

            for(Offer_Payment_Plan_Item__c PPI : offerPPIs) {
                Invoice__c invoice = new Invoice__c(
                    Account__c = PPI.Offer__r.Account__c,
                    Actual_Due_Date__c = PPI.Tentative_Due_Date__c,
                    Contact__c = PPI.Offer__r.Contact__c,
                    Invoice_Amount__c = PPI.Amount__c,
                    Invoice_Date__c = Date.today(),
                    Milestone__c = PPI.Milestone__c,
                    Project__c = PPI.Offer__r.Project__c,
                    Properties__c = PPI.Offer__r.property_id__c,
                    Status__c = 'Active',
                    Tax_Value__c = PPI.Tax_Amount__c,
                    Total_Amount_Excluding_Tax__c = PPI.Amount_Excl_Tax__c,
                    Units__c = PPI.Unit__c,
                    Offer_Payment_Plan_Item__c = PPI.Id,
                    Offer__c = PPI.Offer__c
                );

                invoiceList.add(invoice);
            }

            insert invoiceList;
            updateOfferPPIs(offerPPIs, invoiceList);
            createStatementOfAccount(invoiceList);

        } catch(Exception e) {
            throw new AuraHandledException('Error while creating invoices: ' + e.getMessage());
        }
    }

    public static void updateOfferPPIs(List<Offer_Payment_Plan_Item__c> offerPPIs, List<Invoice__c> invoiceList) {

        if(offerPPIs == null || offerPPIs.isEmpty()) {
            throw new AuraHandledException('offerPPIs can\'t be empty');
        }

        if(invoiceList == null || invoiceList.isEmpty()) {
            throw new AuraHandledException('invoiceList was empty and it cant\'t be empty');
        }

        Map<String, String> hmap = new Map<String, String>();

        for(Invoice__c inv : invoiceList) {
            hmap.put(inv.Offer_Payment_Plan_Item__c, inv.Id);
        }

        try {
            List<Offer_Payment_Plan_Item__c> offerPPIList = new List<Offer_Payment_Plan_Item__c>();

            for(Offer_Payment_Plan_Item__c PPI : offerPPIs) {

                Offer_Payment_Plan_Item__c newPPI = new Offer_Payment_Plan_Item__c(
                    Id = PPI.Id,
                    Invoiced__c = true,
                    Invoice_Date__c = Date.today(),
                    Status__c = 'Invoiced',
                    Invoice__c = hmap.get(PPI.Id)
                );

                offerPPIList.add(newPPI);
            }

            update offerPPIList;

        } catch(Exception e) {
            throw new AuraHandledException('Error while updating offer payment plan items');
        }
    }

    public static void createStatementOfAccount(List<Invoice__c> invoiceList) {

        if(invoiceList == null || invoiceList.isEmpty()) {
            throw new AuraHandledException('invoiceList was empty and it cant\'t be empty');
        }

        try {
            List<Statement_of_account__c> statements = new List<Statement_of_account__c>();

            for(Invoice__c inv : invoiceList) {
                Statement_of_account__c statement = new Statement_of_account__c(
                    Account__c = inv.Account__c,
                    Amount__c = inv.Invoice_Amount__c,
                    Customer_Contact__c = inv.Contact__c,
                    Mode__c = 'Debit',
                    Type__c = 'Invoice',
                    Unit__c  = inv.Units__c,
                    Offer__c = inv.Offer__c
                );

                statements.add(statement);
            }

            insert statements;

        } catch(Exception e) {
            throw new AuraHandledException('Error while creating statement of accounts: ' + e.getMessage());
        }
    }

    @AuraEnabled(cacheable=true)
    public static List<Offer__c> getOffersFromOpportunity(String oppId) {

        if(String.isBlank(oppId)) {
            throw new AuraHandledException('Opportunity Id is required');
        }

        try {
            List<Offer__c> offers = [ 
                SELECT 
                    Id, Name, Project__c, Unit__r.Project__r.Name, Unit_Price__c, Unit__c, Unit__r.Name, Unit__r.Bedrooms__c, Unit__r.Total_Area__c  
                FROM 
                    Offer__c 
                WHERE 
                    Generate_Offer_Payment_Plan__c = true 
                AND 
                    Opportunity__c =: oppId
            ];

            return offers;
        } catch(Exception e) {
            throw new AuraHandledException('Error while fetching offers: ' + e.getMessage());
        }
    }

    @AuraEnabled(cacheable=true) 
    public static List<Offer_Payment_Plan_Item__c> getOfferPaymentPlanItems(String offerId) {
        
        if(String.isBlank(offerId)) {
            throw new AuraHandledException('offerId is required');
        }

        try {
            return [
                SELECT 
                    Id, Name, Name__c, Amount_Excl_Tax__c, Tax_Amount__c, Amount__c, Status__c, Invoice_Date__c, Tentative_Due_Date__c
                FROM 
                    Offer_Payment_Plan_Item__c
                WHERE
                    Offer__c =: offerId
            ];
        } catch(Exception e) {
            throw new AuraHandledException('Error while fetching offer payment plan items');
        }
    }

    public static void updateBulkInvoiceGeneratedFlag(String oppId) {
        if(String.isBlank(oppId)) {
            throw new AuraHandledException('Opportunity id is required');
        }

        try {
            Opportunity opp = new Opportunity(
                Id = OppId,
                Bulk_Invoice_Generated__c = true
            );

            update opp;
        } catch(Exception e) {
            throw new AuraHandledException('Failed to update the Flag field Bulk_Invoice_Generated__c: ' + e.getMessage());
        }
    }

    @AuraEnabled
    public static void createReceipt(String PPItemId, String mode, string txnNo) {
        if(String.isBlank(PPItemId)) {
            throw new AuraHandledException('Offer Payment Plan Id is requierd');
        }

        try {
            Invoice__c inv = [ 
                SELECT 
                    Id, Account__c, Contact__c, Units__c, Offer__c, Offer_Payment_Plan_Item__c, Invoice_Amount__c  
                FROM 
                    Invoice__c 
                WHERE 
                    Offer_Payment_Plan_Item__c =: PPItemId
                LIMIT 1 
            ];

            Receipt__c rec = new Receipt__c(
                Account__c = inv.Account__c,
                Contact__c = inv.Contact__c,
                Units__c = inv.Units__c,
                Offer__c = inv.Offer__c,
                Receipt_For__c = 'Apartment Price',
                Mode__c = mode,
                Txn_Number__c = txnNo,
                Amount__c = inv.Invoice_Amount__c
            );

            insert rec;

            Offer_Payment_Plan_Item__c PPI = new Offer_Payment_Plan_Item__c(
                Id = PPItemId,
                Status__c = 'Received',
                Received_Amount__c = rec.Amount__c
            );

            update PPI;

            Offer__c off = [ SELECT Id, Received_Amount__c FROM Offer__c WHERE Id =: inv.Offer__c LIMIT 1];
            off.Received_Amount__c += inv.Invoice_Amount__c;

            update off;
        } catch(Exception e) {
            throw new AuraHandledException('Error while creating receipts: ' + e.getMessage());
        }
    }
}