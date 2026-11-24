public without sharing class CpUnitsController {
    
    @AuraEnabled(cacheable = true)
    public static Units__c getUnitDetails(String unitId) {
        
        if(String.isBlank(unitId)) {
            return new Units__c();
        }

        try {
            Units__c unit = [
                SELECT 
                    Id, Bedrooms__c, Bathrooms__c, Floor__c, Noof_Parking__c, Balconies__c,
                    Properties__r.Name, Total_Area__c, Internal_Area__c, Built_Up_Area__c,
                    Parking_Area__c, Name, Floor_Plan__c, Unit_Price__c 
                FROM 
                    Units__c
                WHERE 
                    Id =: unitId
            ];

            return unit;
        } catch(Exception e) {
            throw new AuraHandledException(e.getMessage());
        }
    }
}