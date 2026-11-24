/**
 * @class       OTPGenerationServiceTest
 * @description Test class for OTPGenerationService.
 *              Covers all three OTP_Generated_Against__c channels (Email, Mobile,
 *              Email And Mobile), validation rules, regeneration expiry, and
 *              portal isolation.
 */
@isTest
private class OTPGenerationServiceTest {

    // ─────────────────────────────────────────────────────────────────
    // CONSTANTS — Centralize picklist/status values
    // ─────────────────────────────────────────────────────────────────
    private static final String CHANNEL_EMAIL       = 'Email';
    private static final String CHANNEL_MOBILE      = 'Mobile';
    private static final String CHANNEL_BOTH        = 'Email And Mobile';
    
    private static final String PORTAL_CUSTOMER     = 'Customer Portal';
    private static final String PORTAL_BROKER       = 'Broker Portal';
    
    private static final String STATUS_GENERATED    = 'Generated';
    private static final String STATUS_SENT         = 'Sent';
    private static final String STATUS_EXPIRED      = 'Expired Due To Regeneration';

    // ─────────────────────────────────────────────────────────────────
    // HELPER — Build request object
    // ─────────────────────────────────────────────────────────────────
    private static OTPGenerationService.OTPRequest buildRequest(
        String email,
        String mobile,
        String generatedAgainst,
        String callFrom
    ) {
        OTPGenerationService.OTPRequest req = new OTPGenerationService.OTPRequest();
        req.emailId              = email;
        req.mobileNumber         = mobile;
        req.otpGeneratedAgainst  = generatedAgainst;
        req.verificationCallFrom = callFrom;
        return req;
    }

    // ─────────────────────────────────────────────────────────────────
    // TEST 1 — Email channel: populates Email__c only
    // ─────────────────────────────────────────────────────────────────
    @isTest
    static void testGenerateOTP_EmailChannel_Success() {
        OTPGenerationService.OTPRequest req = buildRequest(
            'test@example.com', null, CHANNEL_EMAIL, PORTAL_CUSTOMER
        );

        Test.startTest();
        OTPGenerationService.OTPResult result = OTPGenerationService.generateOTP(JSON.serialize(req));
        Test.stopTest();

        Assert.isTrue(result.isSuccess, 'Expected success: ' + result.errorMessage);
        Assert.isNotNull(result.validTill, 'validTill should be populated on success');

        OTP_Verification__c rec = [
            SELECT Email__c, Mobile__c, OTP_Generated_Against__c, Status__c, OTP_Code__c
            FROM   OTP_Verification__c 
            WHERE Id = :result.otpRecordId
        ];
        
        Assert.areEqual('test@example.com', rec.Email__c, 'Email__c should be set appropriately');
        Assert.isNull(rec.Mobile__c, 'Mobile__c should be null for Email channel');
        Assert.areEqual(CHANNEL_EMAIL, rec.OTP_Generated_Against__c, 'Generated against mismatch');
        Assert.areEqual(STATUS_GENERATED, rec.Status__c, 'Status should be Generated');
        Assert.areEqual(6, rec.OTP_Code__c.length(), 'OTP Code should be exactly 6 digits');
    }

    // ─────────────────────────────────────────────────────────────────
    // TEST 2 — Mobile channel: populates Mobile__c only
    // ─────────────────────────────────────────────────────────────────
    @isTest
    static void testGenerateOTP_MobileChannel_Success() {
        OTPGenerationService.OTPRequest req = buildRequest(
            null, '+919876543210', CHANNEL_MOBILE, PORTAL_CUSTOMER
        );

        Test.startTest();
        OTPGenerationService.OTPResult result = OTPGenerationService.generateOTP(JSON.serialize(req));
        Test.stopTest();

        Assert.isTrue(result.isSuccess, 'Expected success: ' + result.errorMessage);
        Assert.isNotNull(result.validTill, 'validTill should be populated on success');

        OTP_Verification__c rec = [
            SELECT Email__c, Mobile__c, OTP_Generated_Against__c
            FROM   OTP_Verification__c 
            WHERE Id = :result.otpRecordId
        ];
        
        Assert.isNull(rec.Email__c, 'Email__c should be null for Mobile channel');
        Assert.areEqual('+919876543210', rec.Mobile__c, 'Mobile__c should be set');
        Assert.areEqual(CHANNEL_MOBILE, rec.OTP_Generated_Against__c, 'Generated against mismatch');
    }

    // ─────────────────────────────────────────────────────────────────
    // TEST 3 — Email And Mobile channel: populates both fields
    // ─────────────────────────────────────────────────────────────────
    @isTest
    static void testGenerateOTP_EmailAndMobileChannel_Success() {
        OTPGenerationService.OTPRequest req = buildRequest(
            'both@example.com', '9876543210', CHANNEL_BOTH, PORTAL_CUSTOMER
        );

        Test.startTest();
        OTPGenerationService.OTPResult result = OTPGenerationService.generateOTP(JSON.serialize(req));
        Test.stopTest();

        Assert.isTrue(result.isSuccess, 'Expected success: ' + result.errorMessage);

        OTP_Verification__c rec = [
            SELECT Email__c, Mobile__c, OTP_Generated_Against__c
            FROM   OTP_Verification__c 
            WHERE Id = :result.otpRecordId
        ];
        
        Assert.areEqual('both@example.com', rec.Email__c, 'Email__c should be set');
        Assert.areEqual('9876543210', rec.Mobile__c, 'Mobile__c should be set');
        Assert.areEqual(CHANNEL_BOTH, rec.OTP_Generated_Against__c, 'Generated against mismatch');
    }

    // ─────────────────────────────────────────────────────────────────
    // TEST 4 — Regeneration (Email channel): old Sent OTP → Expired Due To Regeneration
    // ─────────────────────────────────────────────────────────────────
    @isTest
    static void testGenerateOTP_EmailChannel_ExpiresPreviousOTP() {
        OTP_Verification__c existing = new OTP_Verification__c(
            Email__c                  = 'regen@example.com',
            OTP_Code__c               = '111111',
            OTP_Generated_Against__c  = CHANNEL_EMAIL,
            OTP_Valid_Till__c         = Datetime.now().addMinutes(10),
            Status__c                 = STATUS_SENT,
            Verification_Call_From__c = PORTAL_CUSTOMER
        );
        insert existing;

        OTPGenerationService.OTPRequest req = buildRequest(
            'regen@example.com', null, CHANNEL_EMAIL, PORTAL_CUSTOMER
        );

        Test.startTest();
        OTPGenerationService.OTPResult result = OTPGenerationService.generateOTP(JSON.serialize(req));
        Test.stopTest();

        Assert.isTrue(result.isSuccess, 'Expected success: ' + result.errorMessage);

        OTP_Verification__c old = [SELECT Status__c FROM OTP_Verification__c WHERE Id = :existing.Id];
        Assert.areEqual(STATUS_EXPIRED, old.Status__c, 'Previous OTP should be marked Expired Due To Regeneration');
    }

    // ─────────────────────────────────────────────────────────────────
    // TEST 5 — Regeneration (Mobile channel): old Generated OTP → Expired Due To Regeneration
    // ─────────────────────────────────────────────────────────────────
    @isTest
    static void testGenerateOTP_MobileChannel_ExpiresPreviousOTP() {
        OTP_Verification__c existing = new OTP_Verification__c(
            Mobile__c                 = '9000000000',
            OTP_Code__c               = '222222',
            OTP_Generated_Against__c  = CHANNEL_MOBILE,
            OTP_Valid_Till__c         = Datetime.now().addMinutes(10),
            Status__c                 = STATUS_GENERATED,
            Verification_Call_From__c = PORTAL_CUSTOMER
        );
        insert existing;

        OTPGenerationService.OTPRequest req = buildRequest(
            null, '9000000000', CHANNEL_MOBILE, PORTAL_CUSTOMER
        );

        Test.startTest();
        OTPGenerationService.OTPResult result = OTPGenerationService.generateOTP(JSON.serialize(req));
        Test.stopTest();

        Assert.isTrue(result.isSuccess, 'Expected success: ' + result.errorMessage);

        OTP_Verification__c old = [SELECT Status__c FROM OTP_Verification__c WHERE Id = :existing.Id];
        Assert.areEqual(STATUS_EXPIRED, old.Status__c, 'Previous OTP should be marked Expired Due To Regeneration');
    }

    // ─────────────────────────────────────────────────────────────────
    // TEST 6 — Regeneration (Email And Mobile): expires OTPs matching email OR mobile
    // ─────────────────────────────────────────────────────────────────
    @isTest
    static void testGenerateOTP_EmailAndMobile_ExpiresBothIdentifiers() {
        OTP_Verification__c byEmail = new OTP_Verification__c(
            Email__c                  = 'combo@example.com',
            OTP_Code__c               = '333333',
            OTP_Generated_Against__c  = CHANNEL_EMAIL,
            OTP_Valid_Till__c         = Datetime.now().addMinutes(10),
            Status__c                 = STATUS_SENT,
            Verification_Call_From__c = PORTAL_CUSTOMER
        );
        OTP_Verification__c byMobile = new OTP_Verification__c(
            Mobile__c                 = '8000000000',
            OTP_Code__c               = '444444',
            OTP_Generated_Against__c  = CHANNEL_MOBILE,
            OTP_Valid_Till__c         = Datetime.now().addMinutes(10),
            Status__c                 = STATUS_GENERATED,
            Verification_Call_From__c = PORTAL_CUSTOMER
        );
        insert new List<OTP_Verification__c>{ byEmail, byMobile };

        OTPGenerationService.OTPRequest req = buildRequest(
            'combo@example.com', '8000000000', CHANNEL_BOTH, PORTAL_CUSTOMER
        );

        Test.startTest();
        OTPGenerationService.OTPResult result = OTPGenerationService.generateOTP(JSON.serialize(req));
        Test.stopTest();

        Assert.isTrue(result.isSuccess, 'Expected success: ' + result.errorMessage);

        List<OTP_Verification__c> expiredRecords = [
            SELECT Status__c FROM OTP_Verification__c
            WHERE Id IN (:byEmail.Id, :byMobile.Id)
        ];
        
        for (OTP_Verification__c rec : expiredRecords) {
            Assert.areEqual(STATUS_EXPIRED, rec.Status__c, 'Both previous OTPs should be expired');
        }
    }

    // ─────────────────────────────────────────────────────────────────
    // TEST 7 — Portal isolation: Broker Portal request does not expire Customer Portal OTP
    // ─────────────────────────────────────────────────────────────────
    @isTest
    static void testGenerateOTP_PortalIsolation() {
        OTP_Verification__c customerOTP = new OTP_Verification__c(
            Email__c                  = 'shared@example.com',
            OTP_Code__c               = '555555',
            OTP_Generated_Against__c  = CHANNEL_EMAIL,
            OTP_Valid_Till__c         = Datetime.now().addMinutes(10),
            Status__c                 = STATUS_SENT,
            Verification_Call_From__c = PORTAL_CUSTOMER
        );
        insert customerOTP;

        OTPGenerationService.OTPRequest req = buildRequest(
            'shared@example.com', null, CHANNEL_EMAIL, PORTAL_BROKER
        );

        Test.startTest();
        OTPGenerationService.OTPResult result = OTPGenerationService.generateOTP(JSON.serialize(req));
        Test.stopTest();

        Assert.isTrue(result.isSuccess, 'Expected success: ' + result.errorMessage);

        OTP_Verification__c unchanged = [SELECT Status__c FROM OTP_Verification__c WHERE Id = :customerOTP.Id];
        Assert.areEqual(STATUS_SENT, unchanged.Status__c, 'Customer Portal OTP must not be affected by Broker Portal request');
    }

    // ─────────────────────────────────────────────────────────────────
    // TEST 8 — Invalid JSON Format
    // ─────────────────────────────────────────────────────────────────
    @isTest
    static void testValidation_InvalidJsonFormat() {
        String invalidJson = '{ invalid json string ';
        
        Test.startTest();
        OTPGenerationService.OTPResult result = OTPGenerationService.generateOTP(invalidJson);
        Test.stopTest();

        Assert.isFalse(result.isSuccess, 'Expected failure for invalid JSON format');
        Assert.isTrue(result.errorMessage.containsIgnoreCase('Invalid request format'), 
            'Error should mention invalid request format: ' + result.errorMessage);
    }

    // ─────────────────────────────────────────────────────────────────
    // TEST 9 — Null request returns failure
    // ─────────────────────────────────────────────────────────────────
    @isTest
    static void testValidation_NullRequest() {
        Test.startTest();
        OTPGenerationService.OTPResult result = OTPGenerationService.generateOTP(null);
        Test.stopTest();

        Assert.isFalse(result.isSuccess, 'Expected failure for null request');
        Assert.isTrue(result.errorMessage.containsIgnoreCase('OTP request cannot be null'), 
            'Error should mention null request: ' + result.errorMessage);
    }

    // ─────────────────────────────────────────────────────────────────
    // TEST 10 — Email channel: missing email returns failure
    // ─────────────────────────────────────────────────────────────────
    @isTest
    static void testValidation_EmailChannel_MissingEmail() {
        OTPGenerationService.OTPRequest req = buildRequest(
            null, null, CHANNEL_EMAIL, PORTAL_CUSTOMER
        );

        Test.startTest();
        OTPGenerationService.OTPResult result = OTPGenerationService.generateOTP(JSON.serialize(req));
        Test.stopTest();

        Assert.isFalse(result.isSuccess, 'Expected failure for missing email');
        Assert.isTrue(result.errorMessage.containsIgnoreCase('Email ID is required'), 
            'Error should mention email: ' + result.errorMessage);
    }

    // ─────────────────────────────────────────────────────────────────
    // TEST 11 — Mobile channel: missing mobile returns failure
    // ─────────────────────────────────────────────────────────────────
    @isTest
    static void testValidation_MobileChannel_MissingMobile() {
        OTPGenerationService.OTPRequest req = buildRequest(
            null, null, CHANNEL_MOBILE, PORTAL_CUSTOMER
        );

        Test.startTest();
        OTPGenerationService.OTPResult result = OTPGenerationService.generateOTP(JSON.serialize(req));
        Test.stopTest();

        Assert.isFalse(result.isSuccess, 'Expected failure for missing mobile');
        Assert.isTrue(result.errorMessage.containsIgnoreCase('Mobile number is required'), 
            'Error should mention mobile: ' + result.errorMessage);
    }

    // ─────────────────────────────────────────────────────────────────
    // TEST 12 — Email And Mobile: missing mobile returns failure
    // ─────────────────────────────────────────────────────────────────
    @isTest
    static void testValidation_EmailAndMobile_MissingMobile() {
        OTPGenerationService.OTPRequest req = buildRequest(
            'test@example.com', null, CHANNEL_BOTH, PORTAL_CUSTOMER
        );

        Test.startTest();
        OTPGenerationService.OTPResult result = OTPGenerationService.generateOTP(JSON.serialize(req));
        Test.stopTest();

        Assert.isFalse(result.isSuccess, 'Expected failure when mobile missing for Email And Mobile');
        Assert.isTrue(result.errorMessage.containsIgnoreCase('Mobile number is required'), 
            'Error should mention mobile: ' + result.errorMessage);
    }

    // ─────────────────────────────────────────────────────────────────
    // TEST 13 — Invalid email format returns failure
    // ─────────────────────────────────────────────────────────────────
    @isTest
    static void testValidation_InvalidEmailFormat() {
        OTPGenerationService.OTPRequest req = buildRequest(
            'not-an-email', null, CHANNEL_EMAIL, PORTAL_CUSTOMER
        );

        Test.startTest();
        OTPGenerationService.OTPResult result = OTPGenerationService.generateOTP(JSON.serialize(req));
        Test.stopTest();

        Assert.isFalse(result.isSuccess, 'Expected failure for invalid email format');
        Assert.isTrue(result.errorMessage.containsIgnoreCase('invalid'), 
            'Error should mention invalid format: ' + result.errorMessage);
    }

    // ─────────────────────────────────────────────────────────────────
    // TEST 14 — Invalid mobile format returns failure
    // ─────────────────────────────────────────────────────────────────
    @isTest
    static void testValidation_InvalidMobileFormat() {
        OTPGenerationService.OTPRequest req = buildRequest(
            null, 'ABC-INVALID', CHANNEL_MOBILE, PORTAL_CUSTOMER
        );

        Test.startTest();
        OTPGenerationService.OTPResult result = OTPGenerationService.generateOTP(JSON.serialize(req));
        Test.stopTest();

        Assert.isFalse(result.isSuccess, 'Expected failure for invalid mobile format');
        Assert.isTrue(result.errorMessage.containsIgnoreCase('invalid'), 
            'Error should mention invalid format: ' + result.errorMessage);
    }

    // ─────────────────────────────────────────────────────────────────
    // TEST 15 — Invalid OTP Generated Against value returns failure
    // ─────────────────────────────────────────────────────────────────
    @isTest
    static void testValidation_InvalidGeneratedAgainstValue() {
        OTPGenerationService.OTPRequest req = buildRequest(
            'test@example.com', '9876543210', 'SMS', PORTAL_CUSTOMER
        );

        Test.startTest();
        OTPGenerationService.OTPResult result = OTPGenerationService.generateOTP(JSON.serialize(req));
        Test.stopTest();

        Assert.isFalse(result.isSuccess, 'Expected failure for unsupported OTP Generated Against value');
        Assert.isTrue(result.errorMessage.containsIgnoreCase('Invalid OTP Generated Against'), 
            'Error should mention invalid value: ' + result.errorMessage);
    }
}