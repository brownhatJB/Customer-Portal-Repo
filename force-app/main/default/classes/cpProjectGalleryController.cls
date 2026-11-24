public without sharing class cpProjectGalleryController {

    public class ProjectItem {
        @AuraEnabled public Id projectId;
        @AuraEnabled public String name;
        @AuraEnabled public String imageUrl;
        @AuraEnabled public String brochureUrl;
        @AuraEnabled public String country;
    }

    @AuraEnabled(cacheable=true)
    public static List<ProjectItem> getProjectsWithAssets(Integer limitSize) {

        Integer lim = (limitSize != null && limitSize > 0 && limitSize <= 200)
            ? limitSize : 30;

        // GET PROJECTS
        List<Project__c> projects = [
            SELECT Id, Name, Country__c
            FROM Project__c
            WHERE Status__c = 'Active'
            ORDER BY LastModifiedDate DESC
            LIMIT :lim
        ];

        Set<Id> projectIds = new Set<Id>();

        for (Project__c p : projects) {
            projectIds.add(p.Id);
        }

        // GET DOCUMENTS
        List<Document__c> docs = [
            SELECT Project__c, ContentDocumentId__c, Name__c
            FROM Document__c
            WHERE Project__c IN :projectIds
            AND ContentDocumentId__c != null
        ];

        // GET FILE IDS
        Set<Id> docIds = new Set<Id>();

        for (Document__c d : docs) {
            docIds.add(d.ContentDocumentId__c);
        }

        // GET PUBLIC URLS
        Map<Id, String> docToUrl = new Map<Id, String>();

        for (ContentDistribution cd : [
            SELECT ContentDocumentId, ContentDownloadUrl
            FROM ContentDistribution
            WHERE ContentDocumentId IN :docIds
        ]) {
            docToUrl.put(cd.ContentDocumentId, cd.ContentDownloadUrl);
        }
        // MAP PROJECT → IMAGE/BROCHURE
        Map<Id, String> projectImage = new Map<Id, String>();
        Map<Id, String> projectBrochure = new Map<Id, String>();

        for (Document__c d : docs) {

            String url = docToUrl.get(d.ContentDocumentId__c);

            if (url == null) {
                continue;
            }

            if (
                d.Name__c == 'Project Image' &&
                !projectImage.containsKey(d.Project__c)
            ) {
                projectImage.put(d.Project__c, url);
            }

            if (
                d.Name__c == 'Project Brochure' &&
                !projectBrochure.containsKey(d.Project__c)
            ) {
                projectBrochure.put(d.Project__c, url);
            }
        }

        // BUILD RESPONSE
        List<ProjectItem> result = new List<ProjectItem>();

        for (Project__c p : projects) {

            ProjectItem item = new ProjectItem();

            item.projectId = p.Id;
            item.name = p.Name;
            item.country = p.Country__c;

            item.imageUrl = projectImage.get(p.Id);
            item.brochureUrl = projectBrochure.get(p.Id);

            result.add(item);
        }

        return result;
    }
}