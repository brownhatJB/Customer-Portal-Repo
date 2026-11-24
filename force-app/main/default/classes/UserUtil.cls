/*******************************************************
 * File: GetMyEnquiries.cls
 * Author: JOUHAR C (jouhar@metadatacorp.com)
 * Date: 16-02-2026
 * Description: This class is used for retrieving current user type.
 * Last Modified By: JOUHAR C
 * Last Modified Date: 
 *******************************************************/

public without sharing class UserUtil {
    @AuraEnabled(cacheable=true)
    public static String getUserType() {
        return UserInfo.getUserType();
    }

    @AuraEnabled(cacheable=true)
    public static Id getContactId() {
        User u = [SELECT ContactId FROM User WHERE Id = :UserInfo.getUserId()];
        return u.ContactId;
    }

    @AuraEnabled(cacheable=true)
    public static String getFirstName() {
        String contactId = getContactId();

        Contact con = [SELECT Id, FirstName FROM Contact WHERE Id =: contactId];

        return con.FirstName;
    }
}