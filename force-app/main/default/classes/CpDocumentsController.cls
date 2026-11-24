public with sharing class CpDocumentsController {

    /**
     * @description Upload or replace a document file.
     * If Document__c.ContentDocumentId__c is present → add new ContentVersion to existing ContentDocument (replace).
     * If empty → create new ContentDocument via ContentVersion, then link to Document__c.
     *
     * @param documentId        Id of the Document__c record
     * @param fileName          Original file name
     * @param base64Data        Base64-encoded file content
     * @param contentType       MIME type e.g. 'application/pdf'
     * @param existingContentDocumentId  Value of Document__c.ContentDocumentId__c (null if new)
     * @return                  Public download URL from ContentDistribution
     */
    @AuraEnabled
    public static String uploadDocument(
        Id documentId,
        String fileName,
        String base64Data,
        String contentType,
        Id existingContentDocumentId
    ) {
        try {
            // ── 1. Create ContentVersion ──────────────────────────────────
            ContentVersion cv = new ContentVersion();
            cv.Title           = fileName;
            cv.PathOnClient    = fileName;
            cv.VersionData     = EncodingUtil.base64Decode(base64Data);
            cv.IsMajorVersion  = true;

            if (existingContentDocumentId != null) {
                // Attach new version to existing document
                cv.ContentDocumentId = existingContentDocumentId;
            } else {
                // New document — Salesforce will auto-create ContentDocument
                cv.FirstPublishLocationId = UserInfo.getUserId();
            }

            insert cv;

            // ── 2. Get the ContentDocumentId ──────────────────────────────
            ContentVersion insertedCv = [
                SELECT Id, ContentDocumentId
                FROM ContentVersion
                WHERE Id = :cv.Id
                WITH USER_MODE
                LIMIT 1
            ];
            Id contentDocumentId = insertedCv.ContentDocumentId;

            // ── 3. Update Document__c ─────────────────────────────────────
            Document__c doc = new Document__c();
            doc.Id                      = documentId;
            doc.ContentDocId__c    = contentDocumentId;
            doc.Status__c               = 'Document Uploaded';
            doc.Document_Uploaded__c    = true;
            update as user doc;

            // ── 4. Create ContentDistribution (public URL) ────────────────
            // Remove any existing ContentDistribution for this ContentDocument
            List<ContentDistribution> existing = [
                SELECT Id
                FROM ContentDistribution
                WHERE ContentDocumentId = :contentDocumentId
                WITH USER_MODE
            ];
            if (!existing.isEmpty()) {
                delete as user existing;
            }

            ContentDistribution cd = new ContentDistribution();
            cd.Name                         = fileName;
            cd.ContentVersionId             = insertedCv.Id;
            cd.PreferencesAllowViewInBrowser = true;
            cd.PreferencesLinkLatestVersion  = true;
            cd.PreferencesNotifyOnVisit      = false;
            cd.PreferencesPasswordRequired   = false;
            cd.PreferencesAllowOriginalDownload = true;
            insert cd;

            // ── 5. Return the public download URL ─────────────────────────
            ContentDistribution insertedCd = [
                SELECT Id, DistributionPublicUrl, ContentDownloadUrl
                FROM ContentDistribution
                WHERE Id = :cd.Id
                WITH USER_MODE
                LIMIT 1
            ];

            return insertedCd.DistributionPublicUrl;

        } catch (Exception e) {
            throw new AuraHandledException(e.getMessage());
        }
    }

    /**
     * @description Get the preview/download URL for an already-uploaded document.
     * Fetches the latest ContentDistribution record for the given ContentDocumentId.
     *
     * @param contentDocumentId   The ContentDocumentId stored on Document__c
     * @return                    ContentDownloadUrl or null if none found
     */
    @AuraEnabled(cacheable=true)
    public static String getDocumentUrl(Id contentDocumentId) {
        try {
            List<ContentDistribution> dists = [
                SELECT ContentDownloadUrl, DistributionPublicUrl
                FROM ContentDistribution
                WHERE ContentDocumentId = :contentDocumentId
                WITH USER_MODE
                ORDER BY CreatedDate DESC
                LIMIT 1
            ];

            return dists.isEmpty() ? null : dists[0].DistributionPublicUrl;

        } catch (Exception e) {
            throw new AuraHandledException(e.getMessage());
        }
    }
}