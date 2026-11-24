/**
 * @module            : Real_Estate_Module
 * @description       : Secure validation controller evaluating dynamic token verification payloads.
 * @author            : Abhisheik S R
 * @group             : Core Security
 * @last modified on  : 2026-05-20
 **/
public without sharing class OTPVerificationService {

    private static final Integer MAX_RETRY_ATTEMPTS = 5;
    
    // Operational Status Mappings
    private static final String STATUS_SENT       = 'Sent';
    private static final String STATUS_VERIFIED   = 'Verified';
    private static final String STATUS_EXPIRED    = 'Expired Before Verification';
    private static final String STATUS_LOCKED     = 'Expired Due To Regeneration';

    // OTP_Generated_Against__c picklist values
    private static final String AGAINST_EMAIL             = 'Email';
    private static final String AGAINST_MOBILE            = 'Mobile';
    private static final String AGAINST_EMAIL_AND_MOBILE  = 'Email And Mobile';

    public class VerificationResult {
        @AuraEnabled public Boolean isSuccess         { get; set; }
        @AuraEnabled public String signedToken        { get; set; }
        @AuraEnabled public Integer remainingAttempts { get; set; }
        @AuraEnabled public String errorMessage        { get; set; }

        public VerificationResult(Boolean isSuccess, String signedToken, Integer remainingAttempts, String errorMessage) {
            this.isSuccess         = isSuccess;
            this.signedToken       = signedToken;
            this.remainingAttempts = remainingAttempts;
            this.errorMessage      = errorMessage;
        }
    }

    /**
     * @description Validates the submitted 6-digit OTP against security bounds for Email, Mobile, or Both.
     * @param emailId Recipient destination string (optional depending on channel).
     * @param mobileNumber Recipient mobile string (optional depending on channel).
     * @param enteredOTP Plain text user entry representation token.
     * @param otpGeneratedAgainst 'Email', 'Mobile', or 'Email And Mobile'.
     * @param verificationCallFrom 'Customer Portal' or 'Broker Portal'.
     */
    @AuraEnabled
    public static VerificationResult verifyOTP(String emailId, String mobileNumber, String enteredOTP, String otpGeneratedAgainst, String verificationCallFrom) {
        
        if (String.isBlank(enteredOTP) || String.isBlank(otpGeneratedAgainst) || String.isBlank(verificationCallFrom)) {
            return new VerificationResult(false, null, 0, 'Invalid argument payloads: Missing core input parameters.');
        }

        String cleanedEmail  = String.isNotBlank(emailId)      ? emailId.trim().toLowerCase() : null;
        String cleanedMobile = String.isNotBlank(mobileNumber) ? mobileNumber.trim()          : null;

        try {
            // 1. Build dynamic matching query based on channel type
            List<OTP_Verification__c> otps = new List<OTP_Verification__c>();

            if (otpGeneratedAgainst == AGAINST_EMAIL) {
                otps = [SELECT Id, OTP_Code__c, OTP_Valid_Till__c, Retry_Count__c, Status__c FROM OTP_Verification__c 
                        WHERE Email__c = :cleanedEmail AND Verification_Call_From__c = :verificationCallFrom AND Status__c = :STATUS_SENT 
                        ORDER BY CreatedDate DESC LIMIT 1];
            } 
            else if (otpGeneratedAgainst == AGAINST_MOBILE) {
                otps = [SELECT Id, OTP_Code__c, OTP_Valid_Till__c, Retry_Count__c, Status__c FROM OTP_Verification__c 
                        WHERE Mobile__c = :cleanedMobile AND Verification_Call_From__c = :verificationCallFrom AND Status__c = :STATUS_SENT 
                        ORDER BY CreatedDate DESC LIMIT 1];
            } 
            else if (otpGeneratedAgainst == AGAINST_EMAIL_AND_MOBILE) {
                // Must validate against records that were intentionally dispatched to both spaces
                otps = [SELECT Id, OTP_Code__c, OTP_Valid_Till__c, Retry_Count__c, Status__c FROM OTP_Verification__c 
                        WHERE Email__c = :cleanedEmail AND Mobile__c = :cleanedMobile AND Verification_Call_From__c = :verificationCallFrom AND Status__c = :STATUS_SENT 
                        ORDER BY CreatedDate DESC LIMIT 1];
            }

            if (otps.isEmpty()) {
                return new VerificationResult(false, null, 0, 'No active verification request found for the given combination.');
            }

            OTP_Verification__c activeOTP = otps[0];
            
            Integer currentAttempts = activeOTP.Retry_Count__c != null ? Integer.valueOf(activeOTP.Retry_Count__c) : 0;
            Integer remainingAttempts = MAX_RETRY_ATTEMPTS - currentAttempts;

            // 2. Brute Force Validation Check
            if (currentAttempts >= MAX_RETRY_ATTEMPTS) {
                if (activeOTP.Status__c != STATUS_LOCKED) {
                    activeOTP.Status__c = STATUS_LOCKED;
                    update activeOTP;
                }
                return new VerificationResult(false, null, 0, 'Maximum retry attempts exceeded. Please generate a new OTP.');
            }

            // 3. Expiration Window Evaluation
            if (Datetime.now() > activeOTP.OTP_Valid_Till__c) {
                activeOTP.Status__c = STATUS_EXPIRED;
                update activeOTP;
                return new VerificationResult(false, null, 0, 'The verification token window has expired. Request a new code.');
            }

            // 4. Content Character Match Processing
            if (activeOTP.OTP_Code__c != enteredOTP.trim()) {
                currentAttempts++;
                remainingAttempts = MAX_RETRY_ATTEMPTS - currentAttempts;
                
                activeOTP.Retry_Count__c = currentAttempts;
                if (currentAttempts >= MAX_RETRY_ATTEMPTS) {
                    activeOTP.Status__c = STATUS_LOCKED;
                }
                update activeOTP;

                String errMessage = (remainingAttempts > 0) 
                    ? 'Incorrect verification code. ' + remainingAttempts + ' attempts remaining.'
                    : 'Maximum retry attempts exceeded. This verification window has been locked.';
                    
                return new VerificationResult(false, null, remainingAttempts, errMessage);
            }

            // 5. SUCCESS: Close state records cleanly
            activeOTP.Status__c = STATUS_VERIFIED;
            update activeOTP;

            // 6. Generate secure base transport signature token
            String contextIdentifier = otpGeneratedAgainst == AGAINST_MOBILE ? cleanedMobile : cleanedEmail;
            String signatureToken = generateSignedToken(contextIdentifier, verificationCallFrom);

            return new VerificationResult(true, signatureToken, remainingAttempts, null);

        } catch (Exception ex) {
            return new VerificationResult(false, null, 0, 'Internal execution error: ' + ex.getMessage());
        }
    }

    /**
     * @description Cryptographically hashes unique contextual session keys.
     */
    private static String generateSignedToken(String identityValue, String portalSource) {
        String timestampStr = String.valueOf(Datetime.now().getTime());
        String dataPayload  = identityValue + '::' + portalSource + '::' + timestampStr;
        
        Blob privateSaltKey = Blob.valueOf('MDRealtyCoreSystemEncryptionKey2026');
        Blob payloadBlob    = Blob.valueOf(dataPayload);
        
        Blob cryptographicSignature = Crypto.generateMac('HmacSHA256', payloadBlob, privateSaltKey);
        
        String tokenBody = EncodingUtil.base64Encode(Blob.valueOf(identityValue + '||' + portalSource));
        String tokenSign = EncodingUtil.base64Encode(cryptographicSignature);
        
        return tokenBody + '.' + tokenSign;
    }
}