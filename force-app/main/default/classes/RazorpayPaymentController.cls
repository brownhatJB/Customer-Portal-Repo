/**
 * @module            : Payment_Gateway_Integration
 * @description       : 
 * @author            : Jouhar C
 * @email             : jouhar@metadatacorp.com
 * @last modified on  : 2026-09-02
 **/

public without sharing class RazorpayPaymentController {
    
    public class OrderResponse {
        @AuraEnabled
        public String orderId;

        @AuraEnabled
        public Decimal amount;

        @AuraEnabled
        public String currencyCode;

        @AuraEnabled
        public String status;
    }

    @AuraEnabled
    public static OrderResponse createOrder(String invoiceId) {

        if(String.isBlank(invoiceId)) {
            throw new AuraHandledException('InvoiceId id is required.');
        }

        try {
            Invoice__c inv = [
                SELECT Id, Name, Invoice_Amount__c, Status__c
                FROM Invoice__c
                WHERE Id = :invoiceId
                LIMIT 1 
            ];

            RazorpayPaymentService.RazorpayOrderResponse razorpayOrder = RazorpayPaymentService.createOrder(inv);

            OrderResponse response = new OrderResponse();
            
            response.orderId = razorpayOrder.orderId;
            response.amount = razorpayOrder.amount;
            response.currencyCode = razorpayOrder.currencyCode;
            response.status = razorpayOrder.status;

            return response;
        } catch(Exception e) {
            throw new AuraHandledException('Unable to create payment order: ' + e.getMessage());
        }
    }

    @AuraEnabled
    public static String createPaymentLink(String invoiceId) {

        if(String.isBlank(invoiceId)) {
            throw new AuraHandledException('Invoice id is required.');
        }

        try {
            Invoice__c inv = [
                SELECT Id,
                    Name,
                    Razorpay_Payment_Link_Id__c,
                    Payment_Link_URL__c,
                    Razorpay_Payment_Link_Status__c,
                    Offer_Payment_Plan_Item__c,
                    Invoice_Amount__c,
                    Gateway_Payment_Amount__c,
                    Offer__r.Originating_Lead__c
                FROM Invoice__c
                WHERE Id = :invoiceId
                LIMIT 1 
            ];

            RazorpayPaymentService.PaymentLinkResponse result = RazorpayPaymentService.createPaymentLink(inv);

            update new Invoice__c(
                Id = inv.Id,
                Razorpay_Payment_Link_Id__c = result.id,
                Payment_Link_URL__c = result.shortUrl,
                Payment_Gateway__c = 'Razorpay',
                Razorpay_Payment_Link_Status__c = result.status,
                Gateway_Payment_Amount__c = result.amount
            );

            return result.shortUrl;
        } catch(AuraHandledException e) {
            throw e;
        } catch(Exception e) {
            throw new AuraHandledException('Unable to create payment link: ' + e.getMessage());
        }
    }


    @AuraEnabled
    public static RazorpayPaymentService.PaymentLinkResponse getOrCreatePaymentLink(String ppiId) {

        if (String.isBlank(ppiId)) {
            throw new AuraHandledException('Offer payment Plan item Id is required.');
        }

        try {

            Invoice__c invoice = [
                SELECT Id,
                    Name,
                    Razorpay_Payment_Link_Id__c,
                    Payment_Link_URL__c,
                    Razorpay_Payment_Link_Status__c,
                    Offer_Payment_Plan_Item__c,
                    Invoice_Amount__c,
                    Gateway_Payment_Amount__c,
                    Offer__r.Originating_Lead__c
                FROM Invoice__c
                WHERE Offer_Payment_Plan_Item__c  = :ppiId
                AND Status__c = 'Active'
                LIMIT 1
            ];

            
            if (
                !String.isBlank(invoice.Razorpay_Payment_Link_Id__c) &&
                invoice.Razorpay_Payment_Link_Status__c == 'created' &&
                !String.isBlank(invoice.Payment_Link_URL__c)
            ) {

                RazorpayPaymentService.PaymentLinkResponse result = new RazorpayPaymentService.PaymentLinkResponse();

                result.id = invoice.Razorpay_Payment_Link_Id__c;
                result.shortUrl = invoice.Payment_Link_URL__c;
                result.status = invoice.Razorpay_Payment_Link_Status__c;
                result.amount = invoice.Invoice_Amount__c;

                return result;
            }

            RazorpayPaymentService.PaymentLinkResponse result = RazorpayPaymentService.createPaymentLink(invoice);

            invoice.Payment_Gateway__c = 'Razorpay';
            invoice.Razorpay_Payment_Link_Id__c = result.id;
            invoice.Payment_Link_URL__c = result.shortUrl;
            invoice.Razorpay_Payment_Link_Status__c = result.status;
            invoice.Gateway_Payment_Amount__c = result.amount;

            update invoice;

            return result;

        } catch (Exception e) {
            throw new AuraHandledException('Unable to get payment link: ' + e.getMessage());
        }
    }

    @AuraEnabled
    public static Invoice__c getInvoiceDetails(String invoiceId) {
        if(String.isBlank(invoiceId)) {
            throw new AuraHandledException('Invoice Id is required');
        }

        Invoice__c inv = [SELECT Id, Offer_Payment_Plan_Item__c FROM Invoice__c WHERE Id = :invoiceId LIMIT 1];

        return inv;
    }


    @AuraEnabled
    public static RazorpayPaymentService.PaymentLinkResponse createPaymentLinkForEoi(String eoiId) {

        if(String.isBlank(eoiId)) {
            throw new AuraHandledException('EOI id is required.');
        }

        try {
            Expression_Of_Interest__c eoi = [
                SELECT Id,
                    Name,
                    Razorpay_Payment_Link_Id__c,
                    Payment_Link_URL__c,
                    Razorpay_Payment_Link_Status__c,
                    EOI_Amount__c,
                    Gateway_Payment_Amount__c
                FROM Expression_Of_Interest__c
                WHERE Id = :eoiId
                LIMIT 1
            ];

            if (
                !String.isBlank(eoi.Razorpay_Payment_Link_Id__c) &&
                eoi.Razorpay_Payment_Link_Status__c == 'created' &&
                !String.isBlank(eoi.Payment_Link_URL__c)
            ) {

                RazorpayPaymentService.PaymentLinkResponse result = new RazorpayPaymentService.PaymentLinkResponse();

                result.id = eoi.Razorpay_Payment_Link_Id__c;
                result.shortUrl = eoi.Payment_Link_URL__c;
                result.status = eoi.Razorpay_Payment_Link_Status__c;
                result.amount = eoi.EOI_Amount__c;

                return result;
            }

            RazorpayPaymentService.PaymentLinkResponse result = RazorpayPaymentService.createPaymentLinkForEoi(eoi);

            update new Expression_Of_Interest__c(
                Id = eoi.Id,
                Razorpay_Payment_Link_Id__c = result.id,
                Payment_Link_URL__c = result.shortUrl,
                Payment_Gateway__c = 'Razorpay',
                Razorpay_Payment_Link_Status__c = result.status,
                Gateway_Payment_Amount__c = result.amount
            );

            return result;
        } catch(AuraHandledException e) {
            throw e;
        } catch(Exception e) {
            throw new AuraHandledException('Unable to create payment link: ' + e.getMessage());
        }
    }
}