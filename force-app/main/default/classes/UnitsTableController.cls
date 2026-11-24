/*******************************************************
 * File: UnitsTableController.cls
 * Author: JOUHAR C (jouhar@metadatacorp.com)
 * Date: 13-02-2026
 * Description: This class is used for retrieving available units and expose these to customer portal.
 * Last Modified By: JOUHAR C
 * Last Modified Date: 
 *******************************************************/

public without sharing class UnitsTableController {
    @AuraEnabled(cacheable = true)
    public static List<Units__c> getAvailableUnits(String unitType, String projectId){
        String query = 'SELECT Id, Name, Type__c, Project__c, Project__r.Name, Total_Area__c, Bedrooms__c, Unit_Price__c, Floor_Plan__c FROM Units__c WHERE Status__c = \'Available\' AND Type__c != \'Parking\'';

        if(String.isNotBlank(unitType) && unitType != 'All'){
            query += ' AND Type__c =: unitType';
        }

        if(String.isNotBlank(projectId) && projectId != 'All') {
            query += ' AND Project__c =: projectId';
        }

        query += ' ORDER BY CreatedDate DESC';

        return Database.query(query);
    }

    @AuraEnabled(cacheable = true)
    public static List<Project__c> getActiveProjects() {
        List<Project__c> projects = [ SELECT Id, Name FROM Project__c WHERE Status__c = 'Active' ];

        return projects;
    }
}