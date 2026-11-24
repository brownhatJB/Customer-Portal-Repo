public without sharing class BrokerNotificationController {
    
    @AuraEnabled(cacheable=true)
    public static List<Broker_Notification__c> getNotifications(String notificationFor) {
        return [
            SELECT Id, Subject__c, Notification_Body__c, CreatedDate, Is_Read__c, Related_Record_ID__c, Target_Portal__c, Notification_Type__c
            FROM Broker_Notification__c 
            WHERE User__c = :UserInfo.getUserId() 
            ORDER BY CreatedDate DESC 
            LIMIT 30
        ];
    }

    @AuraEnabled
    public static void markAllNotificationsAsRead(String notificationFor) {
        List<Broker_Notification__c> unreadNotes = [
            SELECT Id FROM Broker_Notification__c 
            WHERE User__c = :UserInfo.getUserId() AND Target_Portal__c = :notificationFor AND Is_Read__c = false
        ];
        for(Broker_Notification__c note : unreadNotes) {
            note.Is_Read__c = true;
        }
        update unreadNotes;
    }
    
    @AuraEnabled
    public static void markNotificationAsRead(Id notificationId) {
        if(notificationId != null) {
            Broker_Notification__c note = new Broker_Notification__c(
                Id = notificationId,
                Is_Read__c = true
            );
            update note;
        }
    }
}