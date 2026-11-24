public without sharing class CpEoiGuestSessionController {

    @AuraEnabled
    public static String generateMagicLink(String email) {
        if (String.isBlank(email)) {
            throw new AuraHandledException('Email is required to generate a magic link.');
        }

        try {
            Blob cryptoBlob = Crypto.generateAesKey(128);
            String rawToken = EncodingUtil.convertToHex(cryptoBlob);

            Blob hashBlob = Crypto.generateDigest('SHA-256', Blob.valueOf(rawToken));
            String hashedToken = EncodingUtil.convertToHex(hashBlob);

            Temporary_Guest_Session__c session = new Temporary_Guest_Session__c(
                Email__c          = email.trim().toLowerCase(),
                Token_Hash__c     = hashedToken,
                Expires_At__c     = System.now().addHours(10),
                Is_Used__c        = false
            );
            insert session;

            return rawToken;
        } catch (Exception e) {
            throw new AuraHandledException('Error generating magic link: ' + e.getMessage());
        }
    }

     @AuraEnabled
    public static Boolean validateToken(String rawToken) { 
        if (String.isBlank(rawToken)) {
            return false;
        }

        try {
            Blob hashBlob = Crypto.generateDigest('SHA-256', Blob.valueOf(rawToken));
            String hashedToken = EncodingUtil.convertToHex(hashBlob);

            List<Temporary_Guest_Session__c> sessions = [
                SELECT Id, Email__c, Expires_At__c, Is_Used__c
                FROM Temporary_Guest_Session__c
                WHERE Token_Hash__c = :hashedToken
                LIMIT 1
            ];

            if (sessions.isEmpty()) {
                return false;
            }

            Temporary_Guest_Session__c session = sessions[0];

            if (session.Expires_At__c < System.now()) {
                update new Temporary_Guest_Session__c(Id = session.Id, Expired__c = true);

                return false; 
            }
            
            session.Is_Used__c = true;
            update session;
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    // Optional helper – return the email that belongs to a valid token
    @AuraEnabled
    public static String getEmailFromToken(String rawToken) {
        if (String.isBlank(rawToken)) {
            return null;
        }

        Blob hashBlob = Crypto.generateDigest('SHA-256', Blob.valueOf(rawToken));
        String hashedToken = EncodingUtil.convertToHex(hashBlob);

        List<Temporary_Guest_Session__c> sessions = [
            SELECT Email__c
            FROM Temporary_Guest_Session__c
            WHERE Token_Hash__c = :hashedToken
              AND Expires_At__c > :System.now()
            LIMIT 1
        ];

        return sessions.isEmpty() ? null : sessions[0].Email__c;
    }
}