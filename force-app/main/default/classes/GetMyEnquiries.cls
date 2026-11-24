/*******************************************************
 * File: GetMyEnquiries.cls
 * Author: JOUHAR C (jouhar@metadatacorp.com)
 * Date: 13-02-2026
 * Description: This class is used for retrieving the data of each customer's enquiries ie leads.
 * Last Modified By: JOUHAR C
 * Last Modified Date: 
 *******************************************************/

public without sharing class GetMyEnquiries {
    @AuraEnabled(cacheable = true)
    public static List<Lead> getMyEnquiries() {
        User u = [ 
                    SELECT ContactId, Email 
                    FROM user 
                    WHERE id =: UserInfo.getUserId() 
                    LIMIT 1
                ];

        List<lead> leads = [ 
                                SELECT Id, Enquiry_Number__c, Interested_In_Project__c, Interested_In_Project__r.Name, CreatedDate, Stage__c
                                FROM Lead 
                                WHERE Contact__c =: u.ContactId
                                ORDER BY CreatedDate DESC
                            ];
        return leads;

    }

    @AuraEnabled(cacheable = true)
    public static Lead getEnquiryDetails(String enquiryId) {

        if(String.isBlank(enquiryId)) {
            throw new AuraHandledException('enquiryId is required, please make sure id is passed while calling this method');
        }

        try {

            Lead ld = [ SELECT Id, Enquiry_Number__c, Interested_In_Project__r.Name, Interested_In_Project__c, Contact__c FROM Lead WHERE Id =: enquiryId LIMIT 1];
            return ld;

        } catch(Exception e) {
            String errorMsg = 'Error while querying lead details: ' + e.getMessage();
            throw new AuraHandledException(errorMsg);
        }
    }

    @AuraEnabled(cacheable=true)
    public static List<Map<String, String>> getEnquiryJourneyStage() {

        List<Map<String, String>> stages = new List<Map<String, String>>();

        Schema.DescribeFieldResult fieldResult = Lead.Stage__c.getDescribe();

        for (Schema.PicklistEntry p : fieldResult.getPicklistValues()) {
            if (p.isActive()) {
                stages.add(new Map<String, String>{
                    'label' => p.getLabel(),
                    'value' => p.getValue()
                });
            }
        }

        return stages;
    }

    @AuraEnabled
    public static Lead getLeadJourneyStage(String leadId) {

        if (String.isBlank(leadId)) {
            throw new AuraHandledException('Lead Id is required');
        }

        return [
            SELECT Id,
                   Enquiry_Number__c,
                   Stage__c
            FROM Lead
            WHERE Id = :leadId
            LIMIT 1
        ];
    }

    @AuraEnabled(cacheable=true)
    public static Lead getLeadEOI(String leadId) {

        if (String.isBlank(leadId)) {
            throw new AuraHandledException('Lead Id is required');
        }

        return [
            SELECT Id,
                   Enquiry_Number__c,
                   Stage__c,
                   Expression_Of_Interest_Flag__c
            FROM Lead
            WHERE Id = :leadId
            LIMIT 1
        ];
    }

    @AuraEnabled
    public static void updateEOIFlag(String leadId, String eoiFlag) {
        if (String.isBlank(leadId)) {
            throw new AuraHandledException('Lead Id is required');
        }

        if (String.isBlank(eoiFlag)) {
            throw new AuraHandledException('EOI Flag value is required');
        }

        try {
            Lead l = new Lead(
                Id = leadId,
                Expression_Of_Interest_Flag__c = eoiFlag
            );

            update l;

        } catch (Exception e) {
            String errorMsg = 'Error while updating EOI flag: ' + e.getMessage();
            throw new AuraHandledException(errorMsg);
        }
    }

    @AuraEnabled
    public static void createOpportunityFromLead(String leadId) {
        if (String.isBlank(leadId)) {
            throw new AuraHandledException('Lead Id is required');
        }

        try {
            Lead ld = [SELECT Id, Name, Contact__c, Contact__r.AccountId FROM Lead WHERE Id = :leadId LIMIT 1];
            LeadStatus convertStatus = [SELECT MasterLabel FROM LeadStatus WHERE IsConverted = true LIMIT 1];

            Database.LeadConvert lc = new Database.LeadConvert();
            lc.setLeadId(leadId);
            lc.setConvertedStatus(convertStatus.MasterLabel);

            // Optional: create Opportunity
            lc.setDoNotCreateOpportunity(false);
            lc.setOpportunityName(ld.Name);
            lc.setContactId(ld.Contact__c);
            lc.setAccountId(ld.Contact__r.AccountId);

            // Perform conversion
            Database.LeadConvertResult result = Database.convertLead(lc);

            if (result.isSuccess()) {
                System.debug('Lead converted successfully');
            } else {
                for (Database.Error err : result.getErrors()) {
                    System.debug(err.getMessage());
                }
            }

        } catch (Exception e) {
            String errorMsg = 'Error while creating Opportunity: ' + e.getMessage();
            throw new AuraHandledException(errorMsg);
        }
    }

    @AuraEnabled(cacheable=true)
    public static Opportunity getOpportunityDetails(String enquiryId) {

        if(String.isBlank(enquiryId)) {
            throw new AuraHandledException('enquiryId is required, please make sure id is passed while calling this method');
        }

        try {
            Opportunity opp = [ SELECT Id, Name, Interested_In_Project__r.Name, Bulk_Invoice_Generated__c FROM Opportunity WHERE Originating_Lead__c  =: enquiryId LIMIT 1];
            return opp;
        } catch (Exception e) {
            throw new AuraHandledException('Error while fetching opportunity details: ' + e.getMessage());
        }
    }
}