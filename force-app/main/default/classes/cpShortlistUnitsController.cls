public without sharing class cpShortlistUnitsController {
    @AuraEnabled
    public static void toggleFavourite(
        Id unitId,
        Id contactId,
        Boolean isFav
    ) {

        Unit_Shortlist__c targetPref;

        // Find shortlist
        List<Unit_Shortlist__c> existingShortlist = [

            SELECT Id
            FROM Unit_Shortlist__c
            WHERE Contact__c = :contactId
            LIMIT 1
        ];

        // Create if not exists
        if (!existingShortlist.isEmpty()) {

            targetPref = existingShortlist[0];

        } else {

            Contact con = [

                SELECT Name
                FROM Contact
                WHERE Id = :contactId
                LIMIT 1
            ];

            targetPref = new Unit_Shortlist__c(

                Contact__c = contactId,
                Name = ('Shortlisted Units - ' + con.Name).left(80)
            );

            insert targetPref;
        }

        String uniqueKey =
            targetPref.Id + '-' + unitId;

        List<Unit_Shortlist_Item__c> existingItems = [

            SELECT Id, Status__c
            FROM Unit_Shortlist_Item__c
            WHERE Unique_Key__c = :uniqueKey
            LIMIT 1
        ];

        // Create new item
        if (existingItems.isEmpty()) {

            insert new Unit_Shortlist_Item__c(

                Unit_Shortlist__c = targetPref.Id,
                Units__c = unitId,
                Unique_Key__c = uniqueKey,
                Status__c = isFav ? 'Active' : 'Inactive'
            );

        } else {

            // Toggle status
            existingItems[0].Status__c =
                isFav ? 'Active' : 'Inactive';

            update existingItems[0];
        }
    }

    @AuraEnabled(cacheable=true)
    public static Boolean isUnitFavourited(
    Id unitId,
    Id contactId
) {

    return [

        SELECT COUNT()
        FROM Unit_Shortlist_Item__c
        WHERE Units__c = :unitId
        AND Unit_Shortlist__r.Contact__c = :contactId
        AND Status__c = 'Active'
    ] > 0;
}
}