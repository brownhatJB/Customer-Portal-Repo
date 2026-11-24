public without sharing class CasePortalController {

    /**
     * Fetch the current community user's cases, most recent first.
     */
    @AuraEnabled(cacheable=true)
    public static List<Case> getCases() {
        try {
            Id contactId = getContactId();
            return [
                SELECT Id, CaseNumber, Subject, Status, Description,
                       Type, CreatedDate, LastModifiedDate, Origin
                FROM   Case
                WHERE  ContactId = :contactId
                ORDER  BY CreatedDate DESC
                LIMIT  50
            ];
        } catch (Exception e) {
            throw new AuraHandledException('Error fetching cases: ' + e.getMessage());
        }
    }

    /**
     * Create a new Case on behalf of the current community user.
     */
    @AuraEnabled
    public static Id createCase(String subject,
                                String category,
                                String description,
                                String base64FileData,
                                String fileName,
                                Id offerId,
                                Id unitSaleId,
                                Id invoiceId,
                                Id leadId) {
        try {
            Id contactId = getContactId();
            Id accountId = getAccountId(contactId);

            Case newCase      = new Case();
            newCase.Subject   = subject;
            newCase.Type      = category;
            newCase.Description = description;
            newCase.ContactId = contactId;
            newCase.AccountId = accountId;
            newCase.Origin    = 'Web';
            newCase.Status    = 'New';

            // Related records
            newCase.Offer__c      = offerId;
            newCase.Unit_Sale__c  = unitSaleId;
            newCase.Invoice__c    = invoiceId;
            newCase.Lead__c       = leadId;

            insert newCase;

            // Attach screenshot if provided
            if (String.isNotBlank(base64FileData) && String.isNotBlank(fileName)) {
                ContentVersion cv      = new ContentVersion();
                cv.Title               = fileName;
                cv.PathOnClient        = fileName;
                cv.VersionData         = EncodingUtil.base64Decode(base64FileData);
                cv.FirstPublishLocationId = newCase.Id;
                insert cv;
            }

            return newCase.Id;
        } catch (Exception e) {
            throw new AuraHandledException('Error creating case: ' + e.getMessage());
        }
    }

   
    private static Id getContactId() {
        User u = [SELECT ContactId FROM User WHERE Id = :UserInfo.getUserId() LIMIT 1];
        if (u.ContactId == null) {
            throw new AuraHandledException('No Contact associated with this user.');
        }
        return u.ContactId;
    }

    private static Id getAccountId(Id contactId) {
        Contact c = [SELECT AccountId FROM Contact WHERE Id = :contactId LIMIT 1];
        return c.AccountId;
    }

    @AuraEnabled(cacheable=true)
    public static Case getCaseDetailforCaseComment(Id caseId) {
    try {
        Id contactId = getContactId();

        return [
            SELECT Id,
                   CaseNumber,
                   Subject,
                   Status,
                   Priority,
                   Type,
                   Description,
                   CreatedDate,
                   LastModifiedDate,
                   Origin,
                   Owner.Name
            FROM Case
            WHERE Id = :caseId
            AND ContactId = :contactId   
            LIMIT 1
        ];

    } catch (Exception e) {
        throw new AuraHandledException('Error fetching case details: ' + e.getMessage());
    }
}


 @AuraEnabled(cacheable=true)
    public static List<Case_Comment__c> getComments(Id caseId) {
        try {
            if (caseId == null) {
                throw new AuraHandledException('Case Id is required');
            }

            Id contactId = getContactId();

            Case c = [
                SELECT Id
                FROM Case
                WHERE Id = :caseId
                AND ContactId = :contactId
                LIMIT 1
            ];

            return [
                SELECT Id,
                       Comment_Text__c,
                       Parent_Comment__c,
                       CreatedDate,
                       CreatedBy.Name
                FROM Case_Comment__c
                WHERE Case__c = :caseId
                ORDER BY CreatedDate DESC
            ];

        } catch (Exception e) {
            throw new AuraHandledException('Error fetching comments: ' + e.getMessage());
        }
    }

     @AuraEnabled
    public static Id addComment(Id caseId, String text, Id parentId) {

        if (caseId == null) {
            throw new AuraHandledException('Case Id is required');
        }

        if (String.isBlank(text)) {
            throw new AuraHandledException('Comment cannot be empty');
        }

        Id contactId = getContactId();

        Case c = [
            SELECT Id
            FROM Case
            WHERE Id = :caseId
            AND ContactId = :contactId
            LIMIT 1
        ];



        List<String> mentionNames = new List<String>();

        Matcher m = Pattern.compile('@([a-zA-Z0-9._ ]+)').matcher(text);

        while (m.find()) {
            mentionNames.add(m.group(1).trim());
        }

        Map<String, Id> nameToUserId = new Map<String, Id>();

        for (String n : mentionNames) {

            List<User> users = [
                SELECT Id, Name
                FROM User
                WHERE Name LIKE :('%' + n + '%')
                LIMIT 1
            ];

            if (!users.isEmpty()) {
                nameToUserId.put(n, users[0].Id);
            }
        }

        List<String> mentionedUserIds = new List<String>();

        for (String n : mentionNames) {
            if (nameToUserId.containsKey(n)) {
                mentionedUserIds.add(String.valueOf(nameToUserId.get(n)));
            }
        }

        Case_Comment__c comment = new Case_Comment__c(
            Case__c = caseId,
            Comment_Text__c = text,
            Parent_Comment__c = parentId,
            Mentioned_Users__c = String.join(mentionedUserIds, ',')
        );

        insert comment;

        // optional chatter sync
        FeedItem post = new FeedItem();
        post.ParentId = caseId;
        post.Body = (parentId != null ? 'Reply: ' : 'Comment: ') + text;
        insert post;

        return comment.Id;
    }

    @AuraEnabled(cacheable=true)
    public static List<User> searchUsers(String searchKey) {

        if (String.isBlank(searchKey)) {
            return new List<User>();
        }

        return [
            SELECT Id, Name
            FROM User
            WHERE IsActive = true 
            AND Name != null AND 
            Name LIKE :('%' + searchKey + '%')
            ORDER BY Name
            LIMIT 5
        ];
    }

    @AuraEnabled
    public static void deleteComment(Id commentId) {
        try {
            delete [
                SELECT Id
                FROM Case_Comment__c
                WHERE Id = :commentId
            ];
        } catch (Exception e) {
            throw new AuraHandledException('Error deleting comment: ' + e.getMessage());
        }
    }
}