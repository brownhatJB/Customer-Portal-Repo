public without sharing class CpPaymentPlanController {
    

    @AuraEnabled(cacheable=true)
    public static List<Offer__c> getOffers(String enquiryId) {
        if(String.isBlank(enquiryId)) {
            return new List<Offer__c>();
        }

        return [
            SELECT Id, Name, Project__c, Unit__r.Project__r.Name, Unit_Price__c, Unit__c, Unit__r.Name, Unit__r.Bedrooms__c, Unit__r.Total_Area__c 
            FROM Offer__c
            WHERE Originating_Lead__c = :enquiryId
        ];
    }


    @AuraEnabled(cacheable=true)
    public static List<Payment_Plan_template__c> getPaymentPlans(Id unitId) {

        if(unitId == null) {
            return new List<Payment_Plan_template__c>();
        }

        Units__c unit = [SELECT Id, Name, Properties__c FROM Units__c WHERE Id =: unitId];

        return [ 
            SELECT Id, Name, 
            (SELECT Id, Payment_Item_Master__r.Name, Item_Name__r.Name, Percentage__c, Payment_Based_On__c, Milestone__r.Name, Tentative_Due_Date__c 
            FROM Template_Items1__r
            ORDER BY Payment_Item_Master__r.Name) 
            FROM Payment_Plan_template__c 
            WHERE Properties__c =: unit.Properties__c
        ];
    }

    public class offerPlanWrapper {
        @AuraEnabled public String offerId {get; set;}
        @AuraEnabled public String planId {get; set;}
    }

    @AuraEnabled
    public static void updateOfferWithPaymentPlan(List<offerPlanWrapper> selections) {

        if(selections == null || selections.isEmpty()) {
            throw new AuraHandledException('selctions cannot be null or empty');
        }

        try {
            List<Offer__c> offersToUpdate = new List<Offer__c>();

            for(offerPlanWrapper selection: selections) {
                offersToUpdate.add(new Offer__c(
                    Id = selection.offerId,
                    Payment_Plan_Template__c = selection.planId,
                    Stages__c = 'Generate Payment Plan',
                    Genrate_Offer_Payment_Plan__c = 'Yes'
                ));
            }
            update offersToUpdate;
        } catch(Exception e) {
            throw new AuraHandledException('Error updating offers with payment plans: ' + e.getMessage());
        }
    }

    @AuraEnabled(cacheable=true)
    public static List<Lead> searchEnquiries(String searchKey, String contactId) {

        if (String.isBlank(searchKey)) {
            return new List<Lead>();
        }

        String keyword = '%' + searchKey + '%';

        return [
            SELECT Id,
                Enquiry_Number__c 
            FROM Lead
            WHERE Enquiry_Number__c  LIKE :keyword
            AND Contact__c = :contactId
            ORDER BY CreatedDate DESC
            LIMIT 10
        ];
    }
}