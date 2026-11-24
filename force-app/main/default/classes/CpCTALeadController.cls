/*******************************************************
 * File: GetMyEnquiries.cls
 * Author: JOUHAR C (jouhar@metadatacorp.com)
 * Date: 17-02-2026
 * Description: This class is used for inserting leads.
 * Last Modified By: JOUHAR C
 * Last Modified Date: 
 *******************************************************/

public without sharing class CpCTALeadController {

    @AuraEnabled(cacheable=true)
    public static List<Account> getBrokerAccounts() {
        try {
            return [
                SELECT Id, Name 
                FROM Account 
                WHERE Type = 'Broker' 
                ORDER BY Name 
                LIMIT 1000
            ];
        } catch (Exception e) {
            throw new AuraHandledException('Error fetching broker accounts');
        }
    }

    @AuraEnabled(cacheable=true)
    public static List<Contact> getBrokerAgents(String accountId) {
        try {
            if (String.isBlank(accountId)) {
                return new List<Contact>();
            }

            return [
                SELECT Id, Name, Email, Phone 
                FROM Contact 
                WHERE AccountId = :accountId 
                ORDER BY Name 
                LIMIT 1000
            ];
        } catch (Exception e) {
            throw new AuraHandledException('Error fetching broker agents');
        }
    }

    @AuraEnabled
    public static Id createLeadFromProjectGallery(
        String projectId,
        String firstName,
        String lastName,
        String email,
        String phone,
        String company,
        String description,
        String brokerAccountId,
        String brokerAgentId,
        Boolean isBrokerPortal
    ) {

        if (String.isBlank(email)) {
            throw new AuraHandledException('Email is required.');
        }

        // ---------------- CONTACT RESOLUTION ----------------
        Id contactId;

        if (!isBrokerPortal) {
            // NON-BROKER → USER CONTACT
            User u = [
                SELECT ContactId
                FROM User
                WHERE Id = :UserInfo.getUserId()
                LIMIT 1
            ];

            contactId = u.ContactId;

            if (contactId == null) {
                throw new AuraHandledException('No Contact linked to user.');
            }

        } else {
            // BROKER → FIND CONTACT BY EMAIL
            List<Contact> cons = [
                SELECT Id
                FROM Contact
                WHERE Email = :email
                LIMIT 1
            ];

            if (!cons.isEmpty()) {
                contactId = cons[0].Id;
            } else {
                contactId = null; // no mapping if not found
            }
        }

        // ---------------- DUPLICATE CHECK ----------------
        if (isBrokerPortal) {

            // Broker Portal: Email + Project validation
            List<Lead> brokerDup = [
                SELECT Id
                FROM Lead
                WHERE Interested_In_Project__c = :projectId
                AND Email = :email
                AND Status NOT IN ('Retired') 
                AND isConverted != TRUE
                LIMIT 1
            ];

            if (!brokerDup.isEmpty()) {
                throw new AuraHandledException(
                    'You already have an active enquiry for this project.'
                );
            }

        } else {

            // Non-broker: Contact + Project validation
            List<Lead> existingLeads = [
                SELECT Id, Status
                FROM Lead
                WHERE Interested_In_Project__c = :projectId
                AND Contact__c = :contactId
                AND Status NOT IN ('Retired') AND 
                isConverted != TRUE
                LIMIT 1
            ];

            if (!existingLeads.isEmpty()) {
                throw new AuraHandledException(
                    'You already have an active enquiry for this project.'
                );
            }
        }

        // ---------------- CREATE LEAD ----------------
        Lead l = new Lead(
            FirstName = firstName,
            LastName = lastName,
            Email = email,
            Phone = phone,
            MobilePhone = phone,
            Company = String.isBlank(company)
            ? (firstName + ' ' + lastName).trim()
            : company,
            Description = description,
            LeadSource = 'Web',
            Lead_Channel__c = 'Website',
            Contact__c = contactId,
            Interested_In_Project__c = projectId,
            Broker_Account__c = brokerAccountId,
            Broker_Agent__c = brokerAgentId
        );

        insert l;
        return l.Id;
    }

    @AuraEnabled
    public static Id createLead(
        String firstName,
        String lastName,
        String email,
        String phone,
        String company,
        String description
    ) {

        if (String.isBlank(email)) {
            throw new AuraHandledException('Email is required.');
        }

        Lead l = new Lead(
            FirstName = firstName,
            LastName = lastName,
            Email = email,
            MobilePhone = phone,
            Phone = phone,
             Company = String.isBlank(company)
            ? (firstName + ' ' + lastName).trim()
            : company,
            Description = description,
            LeadSource = 'Web',
            Lead_Channel__c = 'Website'
        );

        insert l;
        return l.Id;
    }
}