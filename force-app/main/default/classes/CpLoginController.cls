/**
 * @module            : Real_Estate_Module
 * @description       : 
 * @namespace         : 
 * @author            : SREERAM.R
 * @group             : 
 * @last modified on  : 16-10-2026
 * @last modified by  : Jouhar C
**/
public without sharing class CpLoginController {
    
    @AuraEnabled
    public static String login(String username, String password, String startUrl) {
        try {

            ApexPages.PageReference lgn = Site.login(username, password, startUrl);

            if(lgn != null) {
                return lgn.getUrl();
            } else {
                return 'Error: Invalid username or password.';
            }

        } catch (Exception e) {

            return 'Error: ' + e.getMessage();
        }
    }

    @AuraEnabled
    public static String signup(
        String firstName,
        String lastName,
        String email,
        String mobile,
        String username,
        String password,
        String startUrl
    ) {
        try {
            
            List<Contact> conList = [SELECT Id, AccountId FROM Contact WHERE Email = :email LIMIT 1];
            Contact con = !conList.isEmpty() ? conList[0] : null;

            User newUser      = new User();
            newUser.FirstName = firstName;
            newUser.LastName  = lastName;
            newUser.Email     = email;
            newUser.MobilePhone = mobile;
            String modifiedUsername = username;
            if(!conList.isEmpty()) {
                
                try {
                    Account acc = [SELECT Id FROM Account WHERE Name = 'Customer Portal Account' LIMIT 1];
                    if(con.AccountId == null) {
                        con.AccountId = acc.Id;
                        update con;
                    }
                    newUser.ContactId = con.Id;
                } catch(Exception e) {
                    throw new AuraHandledException('Error: Required account "Customer Portal Account - DO NOT DELETE" not found.');
                }
            }

            if(username.contains('@')) {
               modifiedUsername = username.substringBefore('@');
            }
            modifiedUsername = modifiedUsername + '.mdrealty@portal.com';
            newUser.Username  = modifiedUsername;
            newUser.CommunityNickname = firstName + Datetime.now().getTime();

            
            Id reg = Site.createPortalUser(newUser, con != null ? con.AccountId : null, password);
 
            if (reg != null) {
                // Auto-login immediately after registration
                ApexPages.PageReference lgn = Site.login(modifiedUsername, password, startUrl);
                if (lgn != null) {
                    return lgn.getUrl();
                }
                // Registration succeeded but login returned null — send to start URL
                return startUrl;
            } else {
                return 'Error: Registration failed. The username or email may already be in use.';
            }
 
        } catch (Exception e) {
            return 'Error: ' + e.getMessage();
        }
    }
}