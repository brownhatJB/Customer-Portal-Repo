public without sharing class CpEoiPortalController {
    // ==============================
    // EOI Response Wrapper
    // ==============================
    public class EOIResponse {

        @AuraEnabled public Id eoiId { get; set; }
        @AuraEnabled public String eoiNumber { get; set; }
        @AuraEnabled public String projectName { get; set; }
        @AuraEnabled public String unitName { get; set; }
        @AuraEnabled public Decimal eoiAmount { get; set; }
        @AuraEnabled public String status { get; set; }
        @AuraEnabled public String submittedDate { get; set; }
        @AuraEnabled public String submittedTime { get; set; }
        @AuraEnabled public String userName { get; set; }
        @AuraEnabled public String LeadName { get; set; }
        @AuraEnabled public String LeadId { get; set; }
        @AuraEnabled public String allocatedUnitName { get; set; }
        @AuraEnabled public String allocatedUnitType { get; set; }
        @AuraEnabled public String allocatedPropertyName { get; set; }
        @AuraEnabled public Boolean unitAccepted  { get; set; }
        @AuraEnabled public Boolean unitRejected  { get; set; }
        @AuraEnabled public String propertyName { get; set; }
        @AuraEnabled public String enqId { get; set; }
        
        


        public EOIResponse(Expression_Of_Interest__c eoi) {

      
        if (eoi == null) {
            return;
        }

        eoiId = eoi.Id;
        eoiNumber = eoi.Name;
        userName = UserInfo.getName();
        unitName = eoi.Unit_Type__c;
        LeadName = eoi.Lead__r.Name;
        LeadId = eoi.Lead__r.Enquiry_Number__c;
        enqId =  eoi.Lead__r.Id;

        unitAccepted = eoi.Unit_Allocated__c;
        unitRejected = eoi.Unit_Rejected__c;

        if (eoi.Allocated_Unit__c != null) {
        allocatedUnitName = eoi.Allocated_Unit__r.Name;
        allocatedUnitType = eoi.Allocated_Unit__r.Type__c;

        allocatedPropertyName =
            eoi.Allocated_Unit__r.Properties__r != null
                ? eoi.Allocated_Unit__r.Properties__r.Name
                : '';
        }

        projectName = eoi.Project__r != null
            ? eoi.Project__r.Name
            : '';

        propertyName = eoi.Properties__r != null
            ? eoi.Properties__r.Name
            : '';

        eoiAmount = eoi.EOI_Amount__c;
        status = eoi.Status__c;

        submittedDate = eoi.CreatedDate != null
            ? eoi.CreatedDate.format('dd MMM yyyy')
            : '';

        submittedTime = eoi.CreatedDate != null
            ? eoi.CreatedDate.format('hh:mm a')
            : '';
            }
               
    }

    @AuraEnabled(cacheable=true)
    public static List<Project__c> getProjects() {
        return [
            SELECT Id, Name
            FROM Project__c
            ORDER BY Name
        ];
    }

    @AuraEnabled(cacheable=true)
    public static List<Properties__c> getProperties(Id projectId) {

    if (projectId == null) {
        return new List<Properties__c>();
    }

    return [
        SELECT Id, Name
        FROM Properties__c
        WHERE Project__c = :projectId 
        AND Launch_Status__c = 'Pre Launch' 
        ORDER BY Name
    ];
}

   @AuraEnabled(cacheable=true)
    public static List<String> getUnitTypes(Id propertyId) {

        if (propertyId == null) {
            return new List<String>();
        }

        Set<String> types = new Set<String>();

        for (Units__c unit : [
            SELECT Type__c
            FROM Units__c
            WHERE Properties__c = :propertyId
        ]) {
            if (unit.Type__c != null) {
                types.add(unit.Type__c);
            }
        }

        List<String> result = new List<String>(types);
        result.sort();

        return result;
    }

    // ==============================
    // Get Logged-in Customer EOIs
    // ==============================
   @AuraEnabled(cacheable=true)
    public static List<EOIResponse> getMyEOIs() {

        User currentUser = [
            SELECT ContactId
            FROM User
            WHERE Id = :UserInfo.getUserId()
            LIMIT 1
        ];

        if (currentUser.ContactId == null) {
            return new List<EOIResponse>();
        }

        List<Expression_Of_Interest__c> eois = [
            SELECT Id, Name, CreatedDate, Project__c,Lead__r.Name,Lead__r.Enquiry_Number__c, Allocated_Unit__c,
                Allocated_Unit__r.Name,Unit_Allocated__c,Unit_Rejected__c,Unit_Allocation_Status__c,
                Allocated_Unit__r.Type__c,Properties__c,Properties__r.Name,
                Allocated_Unit__r.Properties__r.Name,
                Project__r.Name, Lead__c,EOI_Amount__c, Status__c,Unit_Type__c
            FROM Expression_Of_Interest__c
            WHERE Lead__r.Contact__c = :currentUser.ContactId
            ORDER BY CreatedDate DESC
        ];

        List<EOIResponse> results = new List<EOIResponse>();

        for (Expression_Of_Interest__c eoi : eois) {

            EOIResponse response = new EOIResponse(eoi);

            // Project Name
            response.projectName = eoi.Project__r != null
                ? eoi.Project__r.Name
                : '';

            response.propertyName = eoi.Properties__r != null
                ? eoi.Properties__r.Name
                : '';

            // Submitted Date & Time
            response.submittedDate = eoi.CreatedDate.format('dd MMM yyyy');
            response.submittedTime = eoi.CreatedDate.format('hh:mm a');

            results.add(response);
        }

        return results;
    }

    // ==============================
    // Create New EOI
    // ==============================
    @AuraEnabled
public static EOIResponse createEOI(
    String projectId, String propertyId,
    String unitName, String propertyName, Decimal eoiAmount,
    String firstName, String lastName,
    String email, String phone
) {

    User currentUser = [
        SELECT ContactId
        FROM User
        WHERE Id = :UserInfo.getUserId()
        LIMIT 1
    ];

    if (String.isBlank(projectId)) {
        throw new AuraHandledException('Project is required.');
    }

    if (String.isBlank(propertyId)) {
        throw new AuraHandledException('Property is required.');
    }

    if (eoiAmount == null || eoiAmount <= 0) {
        throw new AuraHandledException(
            'EOI amount must be greater than zero.'
        );
    }

    Lead leadRecord;

    // Logged-in user with Contact
    if (currentUser.ContactId != null) {

        Contact contact = [
            SELECT Id, FirstName, LastName, Email, Phone
            FROM Contact
            WHERE Id = :currentUser.ContactId
            LIMIT 1
        ];

        // Check for existing Lead with same Contact and Project
        List<Lead> existingLeads = [
            SELECT Id, Name, Enquiry_Number__c
            FROM Lead
            WHERE Contact__c = :contact.Id
            AND Interested_in_Project__c = :projectId
            AND IsConverted = FALSE AND Status NOT IN ('Retired')
            ORDER BY CreatedDate DESC
            LIMIT 1
        ];

        if (!existingLeads.isEmpty()) {

            // Use existing Lead
            leadRecord = existingLeads[0];

        } else {

            // Create new Lead
            leadRecord = new Lead(
                FirstName = contact.FirstName,
                LastName = String.isBlank(contact.LastName)
                    ? 'Customer'
                    : contact.LastName,
                Email = contact.Email,
                MobilePhone = contact.Phone,
                Phone = contact.Phone,
                Company = (
                    String.isBlank(contact.FirstName)
                        ? contact.LastName
                        : contact.FirstName + ' ' + contact.LastName
                ).trim(),
                LeadSource = 'Web',
                Lead_Channel__c = 'Website',
                Contact__c = contact.Id,
                Interested_in_Project__c = projectId,
                Create_Profile__c = false
            );

            insert leadRecord;
        }

    } else {

        if (String.isBlank(email) || String.isBlank(phone)) {
            throw new AuraHandledException(
                'Email and phone number are required.'
            );
        }

        Contact existingContact;

        List<Contact> contacts = [
            SELECT Id, FirstName, LastName, Email, Phone
            FROM Contact
            WHERE Email = :email.trim().toLowerCase()
            LIMIT 1
        ];

        if (!contacts.isEmpty()) {
            existingContact = contacts[0];
        }

        // Check for existing Lead with same Contact and Project
        if (existingContact != null) {

            List<Lead> existingLeads = [
                SELECT Id, Name, Enquiry_Number__c
                FROM Lead
                WHERE Contact__c = :existingContact.Id
                AND Interested_in_Project__c = :projectId  
                AND IsConverted = FALSE AND Status NOT IN ('Retired')
                ORDER BY CreatedDate DESC
                LIMIT 1
            ];

            if (!existingLeads.isEmpty()) {

                // Use existing Lead
                leadRecord = existingLeads[0];

            } else {

                // Create new Lead
                leadRecord = new Lead(
                    FirstName = existingContact.FirstName,
                    LastName = String.isBlank(existingContact.LastName)
                        ? 'Customer'
                        : existingContact.LastName,
                    Email = existingContact.Email,
                    MobilePhone = existingContact.Phone,
                    Phone = existingContact.Phone,
                    Company = (
                        String.isBlank(existingContact.FirstName)
                            ? existingContact.LastName
                            : existingContact.FirstName + ' ' +
                              existingContact.LastName
                    ).trim(),
                    LeadSource = 'Web',
                    Lead_Channel__c = 'Website',
                    Contact__c = existingContact.Id,
                    Interested_in_Project__c = projectId,
                    Create_Profile__c = false
                );

                insert leadRecord;
            }

        } else {

            // No existing Contact → create new Lead
            leadRecord = new Lead(
                FirstName = firstName,
                LastName = String.isBlank(lastName)
                    ? 'Customer'
                    : lastName,
                Email = email,
                MobilePhone = phone,
                Phone = phone,
                Company = (
                    String.isBlank(firstName)
                        ? lastName
                        : firstName + ' ' + lastName
                ).trim(),
                LeadSource = 'Web',
                Lead_Channel__c = 'Website',
                Contact__c = null,
                Interested_in_Project__c = projectId,
                Create_Profile__c = false
            );

            insert leadRecord;
        }
    }

        // Get Lead details
        leadRecord = [
            SELECT Id, Name, Enquiry_Number__c
            FROM Lead
            WHERE Id = :leadRecord.Id
            LIMIT 1
        ];

        // Create EOI
        Expression_Of_Interest__c newEOI =
            new Expression_Of_Interest__c();

        newEOI.Lead__c = leadRecord.Id;
        newEOI.Project__c = projectId;
        newEOI.EOI_Amount__c = eoiAmount;
        newEOI.Status__c = 'Initiated';
        newEOI.Unit_Type__c = unitName;
        newEOI.Properties__c = propertyId;

        insert newEOI;

        newEOI = [
            SELECT
                Id, Name, CreatedDate,
                Project__c, Project__r.Name,
                EOI_Amount__c, Status__c,
                Unit_Type__c, Properties__r.Name, Properties__c,
                Lead__r.Name,  Lead__r.Enquiry_Number__c,Unit_Allocation_Status__c,
                Allocated_Unit__c, Unit_Allocated__c, Unit_Rejected__c,
                Allocated_Unit__r.Name, Allocated_Unit__r.Type__c,
                Allocated_Unit__r.Properties__r.Name
            FROM Expression_Of_Interest__c
            WHERE Id = :newEOI.Id
            LIMIT 1
        ];

        return new EOIResponse(newEOI);
    }
        
    @AuraEnabled(cacheable=true)
    public static EOIResponse getEOIDetails(Id eoiId) {

        if (eoiId == null) {
            throw new AuraHandledException('EOI Id is required.');
        }

        Expression_Of_Interest__c eoi = [
            SELECT Id, Name, CreatedDate, Project__c,Lead__r.Name,Lead__r.Enquiry_Number__c,
                Properties__c,Properties__r.Name,
                Project__r.Name, EOI_Amount__c, Status__c,Unit_Type__c, Unit__c,
                Allocated_Unit__r.Name,Allocated_Unit__r.Type__c, Allocated_Unit__r.Properties__r.Name,
                Unit_Allocated__c, Unit_Rejected__c,Unit_Allocation_Status__c
            FROM Expression_Of_Interest__c
            WHERE Id = :eoiId
            LIMIT 1
        ];
        return new EOIResponse(eoi);
    }



    @AuraEnabled(cacheable=true)
    public static Decimal calculateEoiAmount(
        Id projectId, Id propertyId, String unitType
    ) {

        if (
            projectId == null || propertyId == null || String.isBlank(unitType)
        ) {
            return 0;
        }
        Project__c selectedProject = [
            SELECT Name
            FROM Project__c
            WHERE Id = :projectId
            LIMIT 1
        ];
        Properties__c selectedProperty = [
            SELECT Name
            FROM Properties__c
            WHERE Id = :propertyId
            LIMIT 1
        ];

        String projectName = selectedProject.Name.trim();
        String propertyName = selectedProperty.Name.trim();
        String selectedUnitType = unitType.trim();

        List<Project_and_EOI__mdt> configs = [
            SELECT Project__c, Property__c,
                Unit_Type__c,  Amount__c,  Global_Amount__c
            FROM Project_and_EOI__mdt
        ];

        for (Project_and_EOI__mdt config : configs) {

            if (
                String.isNotBlank(config.Project__c) &&
                String.isNotBlank(config.Property__c) &&
                String.isNotBlank(config.Unit_Type__c) &&
                config.Project__c.trim().equalsIgnoreCase(projectName) &&
                config.Property__c.trim().equalsIgnoreCase(propertyName) &&
                config.Unit_Type__c.trim().equalsIgnoreCase(selectedUnitType)
            ) {
                System.debug( 'SPECIFIC MATCH FOUND! Amount: ' + config.Amount__c );

                return config.Amount__c != null
                    ? config.Amount__c
                    : 0;
            }
        }
        for (Project_and_EOI__mdt config : configs) {

            if (config.Global_Amount__c == true) {
                System.debug( 'GLOBAL DEFAULT MATCH FOUND! Amount: ' + config.Amount__c );

                return config.Amount__c != null
                    ? config.Amount__c
                    : 0;
            }
        }
        System.debug('NO MATCH FOUND - Returning 0');
        return 0;
    }

    @AuraEnabled
    public static void markProfileForEoi(Id eoiId) {

         if (eoiId == null) {
        return;
    }

    Expression_Of_Interest__c eoi = [
        SELECT Id,
               Status__c, Lead__c
        FROM Expression_Of_Interest__c
        WHERE Id = :eoiId
        LIMIT 1
    ];

    if (eoi.Status__c != 'Received') {
        return;
    }

    if (eoi.Lead__c == null) {
        return;
    }

    Lead leadRecord = [
        SELECT Id,
               Contact__c,
               Create_Profile__c
        FROM Lead
        WHERE Id = :eoi.Lead__c
        LIMIT 1
    ];

    // New guest Lead
    if (leadRecord.Contact__c == null) {
        leadRecord.Create_Profile__c = true;
        update leadRecord;
    }
    }

    @AuraEnabled
    public static void createCommunityUser(Id eoiId) {

    if (eoiId == null) {
        return;
    }

    Expression_Of_Interest__c eoi = [
        SELECT Id,
               Status__c,
               Lead__c
        FROM Expression_Of_Interest__c
        WHERE Id = :eoiId
        LIMIT 1
    ];

    if (
        eoi.Status__c != 'Received' ||
        eoi.Lead__c == null
    ) {
        return;
    }

    Lead leadRecord = [
        SELECT Id,
               Contact__c
        FROM Lead
        WHERE Id = :eoi.Lead__c
        LIMIT 1
    ];

    if (leadRecord.Contact__c == null) {
    return;
    }

    Contact contactRecord = [
        SELECT Id,
               FirstName, LastName, Email
        FROM Contact
        WHERE Id = :leadRecord.Contact__c
        LIMIT 1
    ];

    List<User> existingUsers = [
        SELECT Id
        FROM User
        WHERE ContactId = :contactRecord.Id
        LIMIT 1
    ];

    if (!existingUsers.isEmpty()) {
        return;
    }

    List<Profile> profiles = [
        SELECT Id
        FROM Profile
        WHERE Name = 'Customer Community User'
        LIMIT 1
    ];

    if (profiles.isEmpty()) {
        throw new AuraHandledException(
            'Customer Community User profile was not found.'
        );
    }

    String uniqueValue = String.valueOf(DateTime.now().getTime());

    User communityUser = new User(
        FirstName = contactRecord.FirstName,
        LastName = String.isBlank(contactRecord.LastName)
            ? 'Customer'
            : contactRecord.LastName,
        Email = contactRecord.Email,
        Username = contactRecord.Email + '.' + uniqueValue,
        Alias = 'cust',
        CommunityNickname = 'customer' + uniqueValue,
        ProfileId = profiles[0].Id,
        ContactId = contactRecord.Id,
        TimeZoneSidKey = 'Asia/Kolkata',
        LocaleSidKey = 'en_IN',
        EmailEncodingKey = 'UTF-8',
        LanguageLocaleKey = 'en_US'
    );

    insert communityUser;
    System.resetPassword(communityUser.Id, true);
    }

    @AuraEnabled(cacheable=true)
    public static List<EOIResponse> getGuestEOIs(
        String email
    ) {

    if (String.isBlank(email)) {
        throw new AuraHandledException( 'Email is required.' );
    }

    String cleanEmail = email.trim().toLowerCase();

 
    List<Expression_Of_Interest__c> eois = [
        SELECT Id, Name, CreatedDate, Project__c, Project__r.Name,Properties__c,
            Properties__r.Name,Lead__r.Name,Lead__r.Enquiry_Number__c,
            Lead__c, Lead__r.Contact__c, EOI_Amount__c, Status__c,Unit_Type__c, Allocated_Unit__c,
            Allocated_Unit__r.Name,Unit_Allocated__c,Unit_Rejected__c,Unit_Allocation_Status__c,
            Allocated_Unit__r.Type__c,
            Allocated_Unit__r.Properties__r.Name
        FROM Expression_Of_Interest__c
        WHERE Lead__r.Email  = :cleanEmail
        ORDER BY CreatedDate DESC
    ];

    List<EOIResponse> results = new List<EOIResponse>();

    for (Expression_Of_Interest__c eoi : eois) {
        results.add(new EOIResponse(eoi));
    }
    return results;
 }

    @AuraEnabled
    public static Boolean checkExistingContact(
    String email,
    String mobile
  ) {
    String cleanEmail = String.isBlank(email)
        ? null
        : email.trim().toLowerCase();

    String cleanMobile = String.isBlank(mobile)
        ? null
        : mobile.trim();

    if (cleanEmail == null && cleanMobile == null) {
        return false;
    }

    List<User> users;

    if (cleanEmail != null && cleanMobile != null) {

        users = [
            SELECT Id
            FROM User
            WHERE Profile.Name = 'Customer Community User'
            AND IsActive = true
            AND (
                Email = :cleanEmail
                OR MobilePhone = :cleanMobile
            )
            LIMIT 1
        ];
    } else if (cleanEmail != null) {

        users = [
            SELECT Id
            FROM User
            WHERE Profile.Name = 'Customer Community User'
            AND IsActive = true
            AND Email = :cleanEmail
            LIMIT 1
        ];

    } else {

        users = [
            SELECT Id
            FROM User
            WHERE Profile.Name = 'Customer Community User'
            AND IsActive = true
            AND MobilePhone = :cleanMobile
            LIMIT 1
        ];
    }

    return !users.isEmpty();
}
    private static String normalizePhone(String phone) {

        if (String.isBlank(phone)) {
            return '';
        }
        return phone.replaceAll('[^0-9]', '');
    }


    @AuraEnabled
    public static Id acceptAllocatedUnit(Id eoiId) {

        if (eoiId == null) {
            throw new AuraHandledException('EOI Id is required.');
        }
        Expression_Of_Interest__c eoi = [
            SELECT Id, Status__c,
                Lead__c, Allocated_Unit__c, Unit_Allocation_Status__c,
                Unit_Allocated__c, Project__c, Unit_Rejected__c,
                Properties__c, Properties__r.Name
            FROM Expression_Of_Interest__c
            WHERE Id = :eoiId
            LIMIT 1
        ];

        if (eoi.Lead__c == null) {
            throw new AuraHandledException('No Lead is linked to this EOI.');
        }
        if (eoi.Allocated_Unit__c == null) {
            throw new AuraHandledException('No unit has been allocated to this EOI.');
        }
        if (eoi.Unit_Allocated__c == true) {
            throw new AuraHandledException('This unit has already been accepted.');
        }

        // Get Lead details
        Lead leadRecord = [
            SELECT Id, Email, Phone, Contact__c
            FROM Lead
            WHERE Id = :eoi.Lead__c
            LIMIT 1
        ];
        // Find an existing Contact by email first
        Contact existingContact;
        List<Contact> matchingContacts = new List<Contact>();

        if (String.isNotBlank(leadRecord.Email)) {
            matchingContacts = [
                SELECT Id, AccountId, Email, Phone
                FROM Contact
                WHERE Email = :leadRecord.Email
                LIMIT 1
            ];

            if (matchingContacts.size() == 1) {
                existingContact = matchingContacts[0];
            }
        }
        // If no unique email match, check phone
        if (existingContact == null && String.isNotBlank(leadRecord.Phone)) {
            matchingContacts = [
                SELECT Id, AccountId, Email, Phone
                FROM Contact
                WHERE Phone = :leadRecord.Phone
                LIMIT 1
            ];

            if (matchingContacts.size() == 1) {
                existingContact = matchingContacts[0];
            }
        }

        // Convert Lead
        Database.LeadConvert lc = new Database.LeadConvert();

        lc.setLeadId(eoi.Lead__c);
        lc.setConvertedStatus('Closed - Converted');
        lc.setDoNotCreateOpportunity(false);
        // Use existing Contact and Account when available
        if (existingContact != null && existingContact.AccountId != null) {
            lc.setContactId(existingContact.Id);
            lc.setAccountId(existingContact.AccountId);
        }

        Database.LeadConvertResult result = Database.convertLead(lc);

        if (!result.isSuccess()) {
            throw new AuraHandledException('Lead conversion failed.');
        }

        Id opportunityId = result.getOpportunityId();
        Id contactId = result.getContactId();
        Id accountId = result.getAccountId();

        // Create Offer
        Offer__c offer = new Offer__c();

        offer.Opportunity__c = opportunityId;
        offer.Originating_Lead__c = eoi.Lead__c;
        offer.Contact__c = contactId;
        offer.Project__c = eoi.Project__c;
        offer.Unit__c = eoi.Allocated_Unit__c;
        offer.Account__c = accountId;

        insert offer;

        // Attach existing EOI receipts to Offer
        List<Receipt__c> receipts = [
            SELECT Id
            FROM Receipt__c
            WHERE Expression_Of_Interest__c = :eoi.Id
        ];

        for (Receipt__c receipt : receipts) {
            receipt.Offer__c = offer.Id;
            receipt.Opportunity__c = opportunityId;
            receipt.Units__c = eoi.Allocated_Unit__c;
        }

        if (!receipts.isEmpty()) {
            update receipts;
        }
        // Accept allocated unit
        eoi.Unit_Allocated__c = true;
        eoi.Unit_Allocation_Status__c = 'Accepted';

        update eoi;
        return opportunityId;
    }

 @AuraEnabled
 public static void rejectAllocatedUnit(Id eoiId) {

    if (eoiId == null) {
        throw new AuraHandledException('EOI Id is required.');
    }

    Expression_Of_Interest__c eoi = [
        SELECT Id,
               Allocated_Unit__c,
               Unit_Rejected__c
        FROM Expression_Of_Interest__c
        WHERE Id = :eoiId
        LIMIT 1
    ];

    if (eoi.Allocated_Unit__c == null) {
        throw new AuraHandledException('No unit has been allocated to this EOI.' );
    }

    if (eoi.Unit_Rejected__c == true) {
        throw new AuraHandledException( 'This unit has already been rejected.');
    }
    eoi.Unit_Rejected__c = true;
    eoi.Unit_Allocation_Status__c = 'Rejected';

    update eoi;
 }

  @AuraEnabled
    public static void cancelEOI(Id eoiId, String newStatus) {

        if (eoiId == null || String.isBlank(newStatus)) {
            throw new AuraHandledException('Invalid EOI details.');
        }

        if (newStatus != 'Cancelled' && newStatus != 'Refund Requested') {
            throw new AuraHandledException('Invalid status transition.');
        }

        Expression_Of_Interest__c eoi = [
            SELECT Id, Status__c
            FROM Expression_Of_Interest__c
            WHERE Id = :eoiId
            LIMIT 1
        ];

        if (eoi.Status__c == 'Initiated' && newStatus == 'Cancelled') {

            eoi.Status__c = 'Cancelled';
            update eoi;

        } else if (eoi.Status__c == 'Received' && newStatus == 'Refund Requested') {

            eoi.Status__c = 'Refund Requested';
            update eoi;

            Approval.ProcessSubmitRequest req = new Approval.ProcessSubmitRequest();
            req.setObjectId(eoiId);
            req.setProcessDefinitionNameOrId('EOI_Cancellation_Approval');

            Approval.process(req);

        } else {
            throw new AuraHandledException( 'EOI cannot be cancelled from its current status.' );
        }
    }

  @AuraEnabled
    public static Integer sendEOIOtp(String email, String phone) {

        if (String.isBlank(email) || String.isBlank(phone)) {
            throw new AuraHandledException( 'Email and phone number are required.' );
        }

        Map<String, Object> request = new Map<String, Object>{
            'emailId' => email,
            'mobileNumber' => phone,
            'otpGeneratedAgainst' => 'Email And Mobile',
            'verificationCallFrom' => 'Customer Portal EOI'
        };

        OTPGenerationService.OTPResult result =  OTPGenerationService.generateOTP(  JSON.serialize(request)  );

        if (result == null || !result.isSuccess) {
            throw new AuraHandledException(
                result != null && String.isNotBlank(result.errorMessage)
                    ? result.errorMessage
                    : 'Unable to send OTP.'
            );
        }

        OTP_Verification__c otpRecord = [
            SELECT Id, OTP_Valid_Till__c
            FROM OTP_Verification__c
            WHERE Id = :result.otpRecordId
            LIMIT 1
        ];

        if (otpRecord.OTP_Valid_Till__c == null) {
            throw new AuraHandledException( 'OTP expiry time is not available.'  );
        }

        Long remainingMilliseconds =  otpRecord.OTP_Valid_Till__c.getTime() -  System.now().getTime();

        Integer remainingSeconds =  Integer.valueOf( Math.max(0, remainingMilliseconds / 1000) );

        return remainingSeconds;
    }

    @AuraEnabled
    public static OTPVerificationService.VerificationResult verifyEOIOtp( String email, String phone, String otp ) {

        if (  String.isBlank(email) || String.isBlank(phone) || String.isBlank(otp) ) {

            throw new AuraHandledException( 'Email, phone number and OTP are required.');
        }

        return OTPVerificationService.verifyOTP(
            email,
            phone,
            otp,
            'Email And Mobile',
            'Customer Portal EOI'
        );
    }

    @AuraEnabled(cacheable=true)
    public static Contact getMyContactDetails() {

    User currentUser = [
        SELECT ContactId
        FROM User
        WHERE Id = :UserInfo.getUserId()
        LIMIT 1
    ];

    if (currentUser.ContactId == null) {
        return null;
    }
    return [
        SELECT Id, FirstName, LastName, Email, Phone
        FROM Contact
        WHERE Id = :currentUser.ContactId
        LIMIT 1
    ];
}
}