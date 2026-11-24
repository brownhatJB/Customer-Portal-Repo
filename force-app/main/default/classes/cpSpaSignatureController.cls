public without sharing class cpSpaSignatureController {
      @AuraEnabled(cacheable=true)
    public static List<Offer__c> getOffersForSPA(string opportunityId) {

        return [
            SELECT Id,
                   Name,
                   Generate_SPA__c,Generate_SPA_From_Portal__c,
                   Unit__r.Name,
                   Payment_Plan_Template__c,
                   Payment_Plan_Template__r.Name,
                   Originating_Lead__r.Enquiry_Number__c
            FROM Offer__c
            WHERE Opportunity__c = :opportunityId
            AND Generate_Payment_Plan_Flag__c = true
        ];
    }

    // 2. Get SPA Files mapped via Document__c
    @AuraEnabled(cacheable=true)
    public static Map<Id, Document__c> getSPAByOffers(List<Id> offerIds) {

        Map<Id, Document__c> result = new Map<Id, Document__c>();

        for (Document__c d : [
            SELECT Id,
                   Offer__c,
                   ContentDocumentId__c,
                   Status__c,
                SPA_Public_Link__c,
                   Name__c
            FROM Document__c
            WHERE Offer__c IN :offerIds
            AND Name__c = 'Sales Purchase Agreement'
            AND Status__c = 'Document Uploaded'
        ]) {
            result.put(d.Offer__c, d);
        }

        return result;
    }

    //  Generate SPA (calls Queueable)
    @AuraEnabled
    public static void generateSPA(Id offerId, Boolean generateSPA) {

    // Update Offer checkbox
    Offer__c off = new Offer__c(
        Id = offerId,
        Generate_SPA_From_Portal__c = generateSPA
    );

    update off;

    // Generate SPA PDF
    // if (generateSPA) {

    //     System.enqueueJob(
    //         new SPAPdfQueueable(
    //             new List<Id>{ offerId }
    //         )
    //     );
    // }
}

    @AuraEnabled
    public static void markSPACompleted(string opportunityId) {
        update new Opportunity(
            Id = opportunityId,
            All_SPA_Confirmed_Flag__c = true
        );
    }
}