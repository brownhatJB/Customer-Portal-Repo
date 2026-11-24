public with sharing class GetContactDetailsAction {

    // =========================
    // Request Wrapper
    // =========================
    public class GetContactDetailsRequest {
        @InvocableVariable(required=true)
        public Id contactId;
    }

    // =========================
    // Response Wrapper
    // =========================
    public class GetContactDetailsResponse {
        @InvocableVariable public String fullName;
        @InvocableVariable public String firstName;
        @InvocableVariable public String lastName;
        @InvocableVariable public String email;
        @InvocableVariable public String phone;

        @InvocableVariable public String street;
        @InvocableVariable public String city;
        @InvocableVariable public String state;
        @InvocableVariable public String postalCode;
        @InvocableVariable public String country;

        @InvocableVariable public String message;
    }

    // =========================
    // Invocable Method
    // =========================
    @InvocableMethod(label='Get Contact Details')
    public static List<GetContactDetailsResponse> getContactDetails(
        List<GetContactDetailsRequest> requests
    ) {

        List<GetContactDetailsResponse> responses = new List<GetContactDetailsResponse>();

        for (GetContactDetailsRequest request : requests) {

            GetContactDetailsResponse response = new GetContactDetailsResponse();

            try {

                if (request == null || request.contactId == null) {
                    throw new AuraHandledException('ContactId is required');
                }

                Contact c = [
                    SELECT Id, FirstName, LastName, Email, MobilePhone,
                           MailingStreet, MailingCity, MailingState,
                           MailingPostalCode, MailingCountry
                    FROM Contact
                    WHERE Id = :request.contactId
                    LIMIT 1
                ];

                response.firstName = c.FirstName;
                response.lastName = c.LastName;

                response.fullName =
                    (c.FirstName != null ? c.FirstName + ' ' : '') +
                    (c.LastName != null ? c.LastName : '');

                response.email = c.Email;
                response.phone = c.MobilePhone;

                response.street = c.MailingStreet;
                response.city = c.MailingCity;
                response.state = c.MailingState;
                response.postalCode = c.MailingPostalCode;
                response.country = c.MailingCountry;

                response.message = 'SUCCESS';

            } catch (Exception e) {
                response.message = 'ERROR: ' + e.getMessage();
            }

            responses.add(response);
        }

        return responses;
    }

    @AuraEnabled(cacheable=true)
    public static String getContactProfileImage(Id contactId) {

        List<Document__c> docs = [
            SELECT ContentDocumentId__c
            FROM Document__c
            WHERE Contact__c = :contactId
            AND Name__c = 'Profile Picture'
            AND ContentDocumentId__c != null
            LIMIT 1
        ];

        if (docs.isEmpty()) {
            return null;
        }

        List<ContentDistribution> cds = [
            SELECT ContentDownloadUrl
            FROM ContentDistribution
            WHERE ContentDocumentId = :docs[0].ContentDocumentId__c
            LIMIT 1
        ];

        if (cds.isEmpty()) {
            return null;
        }

        return cds[0].ContentDownloadUrl;
    }

    @AuraEnabled(cacheable=true)
    public static Id getProfileDocument(Id contactId) {

        Document__c doc = [
            SELECT Id
            FROM Document__c
            WHERE Contact__c = :contactId
            AND Name__c = 'Profile Picture'
            LIMIT 1
        ];

        return doc.Id;
    }
    
}