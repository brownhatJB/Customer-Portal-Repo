public with sharing class cpLeadFieldSetController {

    @AuraEnabled(cacheable=true)
    public static List<Map<String, Object>> getFieldSetFields() {

        List<Map<String, Object>> result = new List<Map<String, Object>>();

        Schema.FieldSet fs = Schema.SObjectType.Lead.FieldSets.Lead_Portal_Fields;

        for (Schema.FieldSetMember f : fs.getFields()) {

            Schema.DescribeFieldResult d =
                Schema.SObjectType.Lead.fields.getMap().get(f.getFieldPath()).getDescribe();

            Map<String, Object> fieldData = new Map<String, Object>();

            fieldData.put('apiName', f.getFieldPath());
            fieldData.put('label', f.getLabel());
            fieldData.put('required', f.getRequired());

            // TYPE
            String type = String.valueOf(d.getType());
            fieldData.put('type', type);

            // PICKLIST VALUES
            if (d.getType() == Schema.DisplayType.Picklist) {
                List<String> pickVals = new List<String>();
                for (Schema.PicklistEntry pe : d.getPicklistValues()) {
                    pickVals.add(pe.getLabel());
                }
                fieldData.put('picklistValues', pickVals);
            }

            result.add(fieldData);
        }

        return result;
    }
}