/**
 * @module            : Real_Estate_Module
 * @description       : get document records for document checklist lwc page
 * @namespace         :
 * @author            : SREERAM.R
 * @group             : Document Checklist
 * @last modified on  : 05-11-2026
 * @last modified by  : SREERAM.R
 **/
public with sharing class DocumentRecordCollection {
  /**
   * @description get document records for document checklist
   * @param recordId record id of the record page in which component is used
   * @return docs document records
   */
  @AuraEnabled(cacheable=true) 
public static List<Document__c> documents(Id recordId) { 
 
    Map<Id, Document__c> uniqueDocsMap = new Map<Id, Document__c>(); 
 
    if (recordId == null) { 
        return new List<Document__c>(); 
    } 
    try { 
 
        String objectApiName = recordId.getSObjectType().getDescribe().getName(); 
 
        List<Document_Visibility__c> configs = [ 
            SELECT Source_Field__c,  Event_Master__c,  Event_Master__r.Extend_Visibility__c,  
                Event_Master__r.Object__c, Visible_Object_Condition__c 
            FROM Document_Visibility__c 
            WHERE Visible_Object__c = :objectApiName 
            AND Active__c = TRUE 
            AND Event_Master__r.Extend_Visibility__c = TRUE 
            WITH USER_MODE 
        ]; 
 
        if (!configs.isEmpty()) { 
            Map<String, Schema.SObjectField> currentFields = 
                Schema.getGlobalDescribe() 
                    .get(objectApiName) 
                    .getDescribe() 
                    .fields 
                    .getMap(); 
 
            Set<String> sourceFieldsToQuery = new Set<String>(); 
 
            for (Document_Visibility__c config : configs) { 
 
                if (String.isNotBlank(config.Source_Field__c)) { 
                        String fieldName = config.Source_Field__c.trim(); 
 
                        if (currentFields.containsKey(fieldName.toLowerCase())) { 
                            sourceFieldsToQuery.add(fieldName); 
                        } 
                } 
 
                if (String.isNotBlank(config.Visible_Object_Condition__c)) { 
 
                    List<String> conditions = config.Visible_Object_Condition__c.split(';'); 
 
                    for (String condition : conditions) { 
 
                        List<String> parts = condition.split('=', 2); 
 
                        if (parts.size() == 2) { 
 
                            String conditionField = parts[0].trim(); 
 
                            if (currentFields.containsKey(conditionField.toLowerCase())) { 
                                sourceFieldsToQuery.add(conditionField); 
                            } 
                        } 
                    } 
                } 
            } 
 
            SObject currentRecord; 
 
            if (!sourceFieldsToQuery.isEmpty()) { 
 
                String fieldsToQueryCsv = String.join( 
                        new List<String>(sourceFieldsToQuery), 
                        ', ' 
                    ); 
 
                String recordQuery = 
                    'SELECT ' + fieldsToQueryCsv + 
                    ' FROM ' + objectApiName + 
                    ' WHERE Id = :recordId' + 
                    ' WITH USER_MODE LIMIT 1'; 
 
                currentRecord = Database.query(recordQuery); 
            } 
 
            Map<String, Set<Id>> eventIdsByLookup =  new Map<String, Set<Id>>(); 
 
            Map<String, Set<Id>> targetIdsByLookup = new Map<String, Set<Id>>(); 
 
            for (Document_Visibility__c config : configs) { 
 
                if (String.isBlank(config.Source_Field__c) || config.Event_Master__c == null) { 
                    continue; 
                } 
 
                if (String.isNotBlank(config.Visible_Object_Condition__c)) { 
 
                    if (currentRecord == null) { 
                        continue; 
                    } 
 
                    List<String> conditions = config.Visible_Object_Condition__c.split(';'); 
 
                    Boolean conditionMatched = true; 
 
                    for (String condition : conditions) { 
 
                        List<String> parts = condition.split('=', 2); 
 
                        if (parts.size() != 2) { 
                            continue; 
                        } 
 
                        String conditionField = parts[0].trim(); 
                        String expectedValue = parts[1].trim(); 
 
                        if (!currentFields.containsKey(conditionField.toLowerCase())) { 
                            conditionMatched = false; 
                            break; 
                        } 
 
                        Object conditionValue = currentRecord.get(conditionField); 
 
                        if (conditionValue == null || 
                            !String.valueOf(conditionValue).trim().equalsIgnoreCase(expectedValue)) { 
                            conditionMatched = false; 
                            break; 
                        } 
                    } 
 
                    if (!conditionMatched) { 
                        continue; 
                    } 
                } 
 
                String sourceField = config.Source_Field__c.trim(); 
 
                Set<Id> targetIds =   new Set<Id>(); 
 
                if (currentFields.containsKey( sourceField.toLowerCase() )) { 
 
                    if (currentRecord == null) { 
                        continue; 
                    } 
 
                    Id targetId =  (Id) currentRecord.get(sourceField); 
 
                    if (targetId != null) { 
                        targetIds.add(targetId); 
                    } 
                } else { 
                    String sourceObject = config.Event_Master__r.Object__c; 
 
                    if (String.isBlank(sourceObject)) { 
                        continue; 
                    } 
 
                    String sourceQuery = 
                        'SELECT Id FROM ' + sourceObject + 
                        ' WHERE ' + sourceField + 
                        ' = :recordId' + 
                        ' WITH USER_MODE'; 
 
                    for (SObject sourceRecord :  Database.query(sourceQuery)) { 
 
                        targetIds.add( 
                            (Id) sourceRecord.get('Id') 
                        ); 
                    } 
                } 
                if (targetIds.isEmpty()) { 
                    continue; 
                } 
                String targetObjectType = 
                    new List<Id>(targetIds)[0] 
                        .getSObjectType() 
                        .getDescribe() 
                        .getName(); 
 
                String docField = getDirectLookupField(targetObjectType); 
 
                if (String.isBlank(docField)) { 
                    continue; 
                } 
                if (!eventIdsByLookup.containsKey(docField)) { 
 
                    eventIdsByLookup.put( 
                        docField, 
                        new Set<Id>() 
                    ); 
                    targetIdsByLookup.put( 
                        docField, 
                        new Set<Id>() 
                    ); 
                } 
                eventIdsByLookup 
                    .get(docField) 
                    .add(config.Event_Master__c); 
 
                targetIdsByLookup 
                    .get(docField) 
                    .addAll(targetIds); 
            } 
 
            for (String docField :  eventIdsByLookup.keySet()) { 
 
                Set<Id> targetIds =  targetIdsByLookup.get(docField); 
 
                Set<Id> eventIds = eventIdsByLookup.get(docField); 
 
                String docQuery = 
                    getBaseDocumentSelect() + 
                    ' WHERE ' + docField + ' IN :targetIds' + 
                    ' AND Event_Master__c IN :eventIds' + 
                    ' WITH USER_MODE' + 
                    ' ORDER BY Event_Master__r.Display_Order__c ASC'; 
 
                for (Document__c doc : 
                     Database.query(docQuery)) { 
 
                    uniqueDocsMap.put(doc.Id, doc); 
                } 
            } 
        } 
        String directDocField = getDirectLookupField(objectApiName); 
 
        if (directDocField != null) { 
 
            String directQuery = 
                getBaseDocumentSelect() + 
                ' WHERE ' + directDocField + 
                ' = :recordId' + 
                ' WITH USER_MODE' + 
                ' ORDER BY Event_Master__r.Display_Order__c ASC'; 
 
            if (objectApiName == 'Inventory_Import__c') { 
                directQuery += ' LIMIT 1'; 
            } 
            for (Document__c doc : 
                 Database.query(directQuery)) { 
 
                uniqueDocsMap.put(doc.Id, doc); 
            } 
        } 
 
    } catch (Exception e) { 
        throw new AuraHandledException('Error retrieving documents: ' + e.getMessage() ); 
    } 
 
    return uniqueDocsMap.values(); 
} 
         
private static String getBaseDocumentSelect() { 
    return 'SELECT Id, Name, Name__c, Expiry_Date__c, Status__c, ' + 
        'contentDocumentId__c, Document_Uploaded__c, ' + 
        'Event_Master__c, Event_Master__r.Display_Order__c, ' + 
        'Required_Document__c, Document_Master__c, Document_Master__r.Validate_expiry_date__c, Document_Validity__c ' + 
        'FROM Document__c'; 
} 
 
private static String getDirectLookupField(String parentObjectApiName) { 
    if (String.isBlank(parentObjectApiName)) { 
        return null; 
    } 
 
    Map<String, Schema.SObjectField> fields = Schema.SObjectType.Document__c.fields.getMap(); 
 
    for (String fieldName : fields.keySet()) { 
        Schema.DescribeFieldResult describeField = fields.get(fieldName).getDescribe(); 
 
        if (describeField.getType() == Schema.DisplayType.Reference) { 
            for (Schema.SObjectType refObject : describeField.getReferenceTo()) { 
                if (refObject.getDescribe().getName().equalsIgnoreCase(parentObjectApiName)) { 
                    return describeField.getName(); 
                } 
            } 
        } 
    } 
    return null; 
}


  @AuraEnabled(cacheable=true) 
  public static List<Document__c> requiredDocuments(Id recordId) { 
 
      Map<Id, Document__c> uniqueDocsMap = new Map<Id, Document__c>(); 
 
    if (recordId == null) { 
        return new List<Document__c>(); 
    } 
    try { 
 
        String objectApiName = recordId.getSObjectType().getDescribe().getName(); 
 
        List<Document_Visibility__c> configs = [ 
            SELECT Source_Field__c,  Event_Master__c,  Event_Master__r.Extend_Visibility__c, Event_Master__r.Object__c, Visible_Object_Condition__c
            FROM Document_Visibility__c 
            WHERE Visible_Object__c = :objectApiName 
            AND Active__c = TRUE 
            AND Event_Master__r.Extend_Visibility__c = TRUE 
            WITH USER_MODE 
        ]; 
 
        if (!configs.isEmpty()) { 
            Map<String, Schema.SObjectField> currentFields = 
                Schema.getGlobalDescribe() 
                    .get(objectApiName) 
                    .getDescribe() 
                    .fields 
                    .getMap(); 
 
            Set<String> sourceFieldsToQuery = new Set<String>(); 
 
            for (Document_Visibility__c config : configs) { 
 
                if (String.isNotBlank(config.Source_Field__c)) { 
 
                    String fieldName = config.Source_Field__c.trim(); 
 
                    if (currentFields.containsKey( 
                        fieldName.toLowerCase() 
                    )) { 
                        sourceFieldsToQuery.add(fieldName); 
                    } 
                } 
 
                if (String.isNotBlank(config.Visible_Object_Condition__c)) { 
 
                    List<String> conditions = config.Visible_Object_Condition__c.split(';'); 
 
                    for (String condition : conditions) { 
 
                        List<String> parts = condition.split('=', 2); 
 
                        if (parts.size() == 2) { 
 
                            String conditionField = parts[0].trim(); 
 
                            if (currentFields.containsKey(conditionField.toLowerCase())) { 
                                sourceFieldsToQuery.add(conditionField); 
                            } 
                        } 
                    } 
                } 
            } 
 
            SObject currentRecord; 
 
            if (!sourceFieldsToQuery.isEmpty()) { 
 
                String fieldsToQueryCsv = String.join( 
                        new List<String>(sourceFieldsToQuery), 
                        ', ' 
                    ); 
 
                String recordQuery = 
                    'SELECT ' + fieldsToQueryCsv + 
                    ' FROM ' + objectApiName + 
                    ' WHERE Id = :recordId' + 
                    ' WITH USER_MODE LIMIT 1'; 
 
                currentRecord = Database.query(recordQuery); 
            } 
 
            Map<String, Set<Id>> eventIdsByLookup =  new Map<String, Set<Id>>(); 
 
            Map<String, Set<Id>> targetIdsByLookup = new Map<String, Set<Id>>(); 
 
            for (Document_Visibility__c config : configs) { 
 
                if (String.isBlank(config.Source_Field__c) || config.Event_Master__c == null) { 
                    continue; 
                } 
 
                if (String.isNotBlank(config.Visible_Object_Condition__c)) { 
 
                    if (currentRecord == null) { 
                        continue; 
                    } 
 
                    List<String> conditions = config.Visible_Object_Condition__c.split(';'); 
 
                    Boolean conditionMatched = true; 
 
                    for (String condition : conditions) { 
 
                        List<String> parts = condition.split('=', 2); 
 
                        if (parts.size() != 2) { 
                            continue; 
                        } 
 
                        String conditionField = parts[0].trim(); 
                        String expectedValue = parts[1].trim(); 
 
                        if (!currentFields.containsKey(conditionField.toLowerCase())) { 
                            conditionMatched = false; 
                            break; 
                        } 
 
                        Object conditionValue = currentRecord.get(conditionField); 
 
                        if (conditionValue == null || 
                            !String.valueOf(conditionValue).trim().equalsIgnoreCase(expectedValue)) { 
                            conditionMatched = false; 
                            break; 
                        } 
                    } 
 
                    if (!conditionMatched) { 
                        continue; 
                    } 
                } 
 
                String sourceField = config.Source_Field__c.trim(); 
 
                Set<Id> targetIds =   new Set<Id>(); 
 
                if (currentFields.containsKey( sourceField.toLowerCase() )) { 
 
                    if (currentRecord == null) { 
                        continue; 
                    } 
 
                    Id targetId =  (Id) currentRecord.get(sourceField); 
 
                    if (targetId != null) { 
                        targetIds.add(targetId); 
                    } 
                } else { 
                    String sourceObject = config.Event_Master__r.Object__c; 
 
                    if (String.isBlank(sourceObject)) { 
                        continue; 
                    } 
 
                    String sourceQuery = 
                        'SELECT Id FROM ' + sourceObject + 
                        ' WHERE ' + sourceField + 
                        ' = :recordId' + 
                        ' WITH USER_MODE'; 
 
                    for (SObject sourceRecord :  Database.query(sourceQuery)) { 
 
                        targetIds.add( 
                            (Id) sourceRecord.get('Id') 
                        ); 
                    } 
                } 
                if (targetIds.isEmpty()) { 
                    continue; 
                } 
                String targetObjectType = 
                    new List<Id>(targetIds)[0] 
                        .getSObjectType() 
                        .getDescribe() 
                        .getName(); 
 
                String docField = getDirectLookupField(targetObjectType); 
 
                if (String.isBlank(docField)) { 
                    continue; 
                } 
                if (!eventIdsByLookup.containsKey(docField)) { 
 
                    eventIdsByLookup.put( 
                        docField, 
                        new Set<Id>() 
                    ); 
                    targetIdsByLookup.put( 
                        docField, 
                        new Set<Id>() 
                    ); 
                } 
                eventIdsByLookup 
                    .get(docField) 
                    .add(config.Event_Master__c); 
 
                targetIdsByLookup 
                    .get(docField) 
                    .addAll(targetIds); 
            } 
 
            for (String docField :  eventIdsByLookup.keySet()) { 
 
                Set<Id> targetIds =  targetIdsByLookup.get(docField); 
 
                Set<Id> eventIds = eventIdsByLookup.get(docField); 
 
                String docQuery = 
                    getBaseDocumentSelect() + 
                    ' WHERE ' + docField + ' IN :targetIds' + 
                    ' AND Event_Master__c IN :eventIds' + 
                    ' AND Required_Document__c = TRUE' + 
                    ' WITH USER_MODE' + 
                    ' ORDER BY Event_Master__r.Display_Order__c ASC'; 
 
                for (Document__c doc : 
                     Database.query(docQuery)) { 
 
                    uniqueDocsMap.put(doc.Id, doc); 
                } 
            } 
        } 
        String directDocField = getDirectLookupField(objectApiName); 
 
        if (directDocField != null) { 
 
            String directQuery = 
                getBaseDocumentSelect() + 
                ' WHERE ' + directDocField + 
                ' = :recordId' + 
                 ' AND Required_Document__c = TRUE' + 
                ' WITH USER_MODE' + 
                ' ORDER BY Event_Master__r.Display_Order__c ASC'; 
 
            if (objectApiName == 'Inventory_Import__c') { 
                directQuery += ' LIMIT 1'; 
            } 
            for (Document__c doc : 
                 Database.query(directQuery)) { 
 
                uniqueDocsMap.put(doc.Id, doc); 
            } 
        } 
 
    } catch (Exception e) { 
        throw new AuraHandledException('Error retrieving documents: ' + e.getMessage() ); 
    } 
 
    return uniqueDocsMap.values(); 
} 

@AuraEnabled
  public static void allRequiredDocsUploaded(String LeadId) {
    if(String.isBlank(LeadId)) {
      throw new AuraHandledException('LeadId is required');
    }
 
    Lead leadRec = [SELECT Id, All_Required_Docs_Uploaded__c FROM Lead WHERE Id = :LeadId LIMIT 1];
 
    if(leadRec != null && leadRec.All_Required_Docs_Uploaded__c == true) {
      return;
    } else {
      update new Lead(Id = LeadId, All_Required_Docs_Uploaded__c = true);
    }
 
 
  }
}