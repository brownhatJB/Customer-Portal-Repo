/**
 * @class       OTPGenerationService
 * @description Service class responsible for generating a 6-digit OTP and creating
 *              the corresponding OTP_Verification__c record.
 *              Accepts OTP_Generated_Against__c, Verification_Call_From__c, emailId,
 *              and mobileNumber. Populates Email__c, Mobile__c, or both on the record
 *              depending on the OTP_Generated_Against__c selection:
 *                - Email             → requires emailId only
 *                - Mobile            → requires mobileNumber only
 *                - Email And Mobile  → requires both emailId and mobileNumber
 *              Marks any previously active OTP for the same contact identifier
 *              + portal as 'Expired Due To Regeneration' before inserting a fresh record.
 * @author      SREERAM.R
 * @date        07/05/2026
 */
public with sharing class OTPGenerationService {

    // OTP expiry window in minutes
    private static final Integer OTP_EXPIRY_MINUTES = 10;

    // Status picklist values
    private static final String STATUS_GENERATED             = 'Generated';
    private static final String STATUS_SENT                  = 'Sent';
    private static final String STATUS_EXPIRED_REGENERATION  = 'Expired Due To Regeneration';

    // OTP_Generated_Against__c picklist values
    private static final String AGAINST_EMAIL             = 'Email';
    private static final String AGAINST_MOBILE            = 'Mobile';
    private static final String AGAINST_EMAIL_AND_MOBILE  = 'Email And Mobile';

    // ─────────────────────────────────────────────────────────────────
    // WRAPPER — Input
    // ─────────────────────────────────────────────────────────────────
    public class OTPRequest {
        @AuraEnabled public String emailId               { get; set; } // Required when against = Email | Email And Mobile
        @AuraEnabled public String mobileNumber          { get; set; } // Required when against = Mobile | Email And Mobile
        @AuraEnabled public String otpGeneratedAgainst   { get; set; } // Email | Mobile | Email And Mobile
        @AuraEnabled public String verificationCallFrom  { get; set; } // Customer Portal | Broker Portal
    }

    // ─────────────────────────────────────────────────────────────────
    // WRAPPER — Result
    // ─────────────────────────────────────────────────────────────────
    public class OTPResult {
        @AuraEnabled public Boolean isSuccess      { get; set; } 
        @AuraEnabled public String  otpRecordId    { get; set; }
        @AuraEnabled public String  otpCode        { get; set; }  // Pass to email service; never expose in UI
        @AuraEnabled public String  errorMessage   { get; set; }
        @AuraEnabled public Datetime validTill     { get; set; }

        public OTPResult(Boolean isSuccess, String otpRecordId, String otpCode, String errorMessage, Datetime validTill) {
            this.isSuccess    = isSuccess;
            this.otpRecordId  = otpRecordId;
            this.otpCode      = otpCode;
            this.errorMessage = errorMessage;
            this.validTill    = validTill;
            
        }
    }

    // ─────────────────────────────────────────────────────────────────
    // MAIN METHOD — Called from LWC or other Apex
    // ─────────────────────────────────────────────────────────────────
    /**
     * @description Generates an OTP, expires any existing active OTPs for the
     *              same email + portal combination, and inserts a new
     *              OTP_Verification__c record.
     *
     * @param  request  OTPRequest wrapper containing emailId, otpGeneratedAgainst,
     *                  and verificationCallFrom
     * @return          OTPResult wrapper with success flag, record Id, OTP code,
     *                  and error message if any
     */
@AuraEnabled
public static OTPResult generateOTP(String requestJson) {
    OTPRequest request;
    try {
        request = (OTPRequest) JSON.deserialize(requestJson, OTPRequest.class);
    } catch (Exception e) {
        return new OTPResult(false, null, null, 'Invalid request format: ' + e.getMessage(), null);
    }

    try {
        validateRequest(request);
    } catch (IllegalArgumentException ex) {
        return new OTPResult(false, null, null, ex.getMessage(), null);
    }

        String emailId              = String.isNotBlank(request.emailId)      ? request.emailId.trim().toLowerCase() : null;
        String mobileNumber         = String.isNotBlank(request.mobileNumber) ? request.mobileNumber.trim()          : null;
        String otpGeneratedAgainst  = request.otpGeneratedAgainst;
        String verificationCallFrom = request.verificationCallFrom;

        try {
            // ── 2. Expire any previously active OTP records ───────────
            expirePreviousOTPs(emailId, mobileNumber, otpGeneratedAgainst, verificationCallFrom);

            // ── 3. Generate a 6-digit OTP ─────────────────────────────
            String otpCode = generateSixDigitOTP();

            // ── 4. Build and insert the new OTP_Verification__c record ─
            OTP_Verification__c otpRecord = buildOTPRecord(
                emailId,
                mobileNumber,
                otpCode,
                otpGeneratedAgainst,
                verificationCallFrom
            );

            insert otpRecord;
            
            //  ROUTING LOGIC: If channel involves email distribution, invoke delivery sub-class
            if (otpGeneratedAgainst == AGAINST_EMAIL || otpGeneratedAgainst == AGAINST_EMAIL_AND_MOBILE) {
            
                OTPEmailService.sendOTPEmail(otpRecord.Id, emailId, otpCode);
            }

            // Note: Clear out the raw otpCode string block before passing back to LWC layout scopes
            return new OTPResult(true, String.valueOf(otpRecord.Id), null, null,  otpRecord.OTP_Valid_Till__c);

        } catch (DmlException dmlEx) {
            return new OTPResult(false, null, null, 'Database registry error: ' + dmlEx.getDmlMessage(0),null);
        } catch (Exception ex) {
            // Catching AuraHandledExceptions bubbling up out of the email service and reflecting messages securely
            return new OTPResult(false, null, null, ex.getMessage(),null);
        }
    }

    // ─────────────────────────────────────────────────────────────────
    // PRIVATE HELPERS
    // ─────────────────────────────────────────────────────────────────

    /**
     * @description Validates that all required fields are present based on the
     *              OTP_Generated_Against__c selection:
     *                - Email            → emailId required, validated for format
     *                - Mobile           → mobileNumber required, validated for format
     *                - Email And Mobile → both required, both validated
     */
    private static void validateRequest(OTPRequest request) {
        if (request == null) {
            throw new IllegalArgumentException('OTP request cannot be null.');
        }
        if (String.isBlank(request.otpGeneratedAgainst)) {
            throw new IllegalArgumentException('OTP Generated Against is required.');
        }
        if (String.isBlank(request.verificationCallFrom)) {
            throw new IllegalArgumentException('Verification Call From is required.');
        }

        Boolean needsEmail  = (request.otpGeneratedAgainst == AGAINST_EMAIL ||
                               request.otpGeneratedAgainst == AGAINST_EMAIL_AND_MOBILE);
        Boolean needsMobile = (request.otpGeneratedAgainst == AGAINST_MOBILE ||
                               request.otpGeneratedAgainst == AGAINST_EMAIL_AND_MOBILE);

        if (needsEmail) {
            if (String.isBlank(request.emailId)) {
                throw new IllegalArgumentException('Email ID is required for the selected OTP channel.');
            }
            if (!isValidEmail(request.emailId)) {
                throw new IllegalArgumentException('Email ID format is invalid.');
            }
        }

        if (needsMobile) {
            if (String.isBlank(request.mobileNumber)) {
                throw new IllegalArgumentException('Mobile number is required for the selected OTP channel.');
            }
            if (!isValidMobile(request.mobileNumber)) {
                throw new IllegalArgumentException('Mobile number format is invalid. Use digits only, 7–15 characters.');
            }
        }

        // Guard against an unsupported picklist value being passed
        if (!needsEmail && !needsMobile) {
            throw new IllegalArgumentException(
                'Invalid OTP Generated Against value: ' + request.otpGeneratedAgainst +
                '. Accepted values: Email, Mobile, Email And Mobile.'
            );
        }
    }

    /**
     * @description Simple email format validation using Apex regex.
     */
    private static Boolean isValidEmail(String email) {
        String emailRegex = '^[a-zA-Z0-9._|\\\\%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,4}$';
        Pattern p = Pattern.compile(emailRegex);
        Matcher m = p.matcher(email.trim());
        return m.matches();
    }

    /**
     * @description Validates mobile number — digits only, 7 to 15 characters (E.164 range).
     *              Strips leading + if present before checking.
     */
    private static Boolean isValidMobile(String mobile) {
        String cleaned = mobile.trim().removeStart('+');
        String mobileRegex = '^[0-9]{7,15}$';
        Pattern p = Pattern.compile(mobileRegex);
        Matcher m = p.matcher(cleaned);
        return m.matches();
    }

    /**
     * @description Finds all active (Generated or Sent) OTP records that match the
     *              contact identifier(s) for this portal and marks them as
     *              'Expired Due To Regeneration'.
     *              Match logic mirrors the OTP_Generated_Against__c value:
     *                - Email            → match on Email__c
     *                - Mobile           → match on Mobile__c
     *                - Email And Mobile → match on either Email__c OR Mobile__c
     *              This prevents orphaned active OTPs regardless of the channel used.
     */
    private static void expirePreviousOTPs(
        String emailId,
        String mobileNumber,
        String otpGeneratedAgainst,
        String verificationCallFrom
    ) {
        List<OTP_Verification__c> existingOTPs = new List<OTP_Verification__c>();

        if (otpGeneratedAgainst == AGAINST_EMAIL) {
            existingOTPs = [
                SELECT Id, Status__c
                FROM   OTP_Verification__c
                WHERE  Email__c                  = :emailId
                AND    Verification_Call_From__c = :verificationCallFrom
                AND    Status__c                 IN (:STATUS_GENERATED, :STATUS_SENT)
                WITH   SECURITY_ENFORCED
            ];

        } else if (otpGeneratedAgainst == AGAINST_MOBILE) {
            existingOTPs = [
                SELECT Id, Status__c
                FROM   OTP_Verification__c
                WHERE  Mobile__c                 = :mobileNumber
                AND    Verification_Call_From__c = :verificationCallFrom
                AND    Status__c                 IN (:STATUS_GENERATED, :STATUS_SENT)
                WITH   SECURITY_ENFORCED
            ];

        } else if (otpGeneratedAgainst == AGAINST_EMAIL_AND_MOBILE) {
            // Expire any active OTP linked to either the email OR the mobile
            // to ensure no stale OTPs remain for this user across channels
            existingOTPs = [
                SELECT Id, Status__c
                FROM   OTP_Verification__c
                WHERE  (Email__c = :emailId OR Mobile__c = :mobileNumber)
                AND    Verification_Call_From__c = :verificationCallFrom
                AND    Status__c                 IN (:STATUS_GENERATED, :STATUS_SENT)
                WITH   SECURITY_ENFORCED
            ];
        }

        if (!existingOTPs.isEmpty()) {
            for (OTP_Verification__c otp : existingOTPs) {
                otp.Status__c = STATUS_EXPIRED_REGENERATION;
            }
            update existingOTPs;
        }
    }

    /**
     * @description Generates a cryptographically random 6-digit OTP string.
     *              Uses Crypto.getRandomInteger() to avoid predictable values.
     */
    private static String generateSixDigitOTP() {
        // getRandomInteger returns a positive random integer.
        // We mod by 900000 and add 100000 to guarantee exactly 6 digits (100000–999999).
        Integer rawInt = Math.abs(Crypto.getRandomInteger());
        Integer otp    = Math.mod(rawInt, 900000) + 100000;
        return String.valueOf(otp);
    }

    /**
     * @description Builds the OTP_Verification__c sObject.
     *              Populates Email__c, Mobile__c, or both based on otpGeneratedAgainst:
     *                - Email            → Email__c only
     *                - Mobile           → Mobile__c only
     *                - Email And Mobile → both Email__c and Mobile__c
     */
    private static OTP_Verification__c buildOTPRecord(
        String emailId,
        String mobileNumber,
        String otpCode,
        String otpGeneratedAgainst,
        String verificationCallFrom
    ) {
        OTP_Verification__c otpRecord = new OTP_Verification__c(
            OTP_Code__c               = otpCode,
            OTP_Generated_Against__c  = otpGeneratedAgainst,
            OTP_Valid_Till__c         = Datetime.now().addMinutes(OTP_EXPIRY_MINUTES),
            Status__c                 = STATUS_GENERATED,
            Verification_Call_From__c = verificationCallFrom
        );

        if (otpGeneratedAgainst == AGAINST_EMAIL) {
            otpRecord.Email__c = emailId;

        } else if (otpGeneratedAgainst == AGAINST_MOBILE) {
            otpRecord.Mobile__c = mobileNumber;

        } else if (otpGeneratedAgainst == AGAINST_EMAIL_AND_MOBILE) {
            otpRecord.Email__c  = emailId;
            otpRecord.Mobile__c = mobileNumber;
        }

        return otpRecord;
    }
}