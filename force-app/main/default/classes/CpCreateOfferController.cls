public without sharing class CpCreateOfferController {

    // ─────────────────────────────────────────
    // Wrapper Classes
    // ─────────────────────────────────────────

    public class CreateOfferSalesProposalData {
        @AuraEnabled public String enqRecordId;
        @AuraEnabled public String enquiry;
        @AuraEnabled public String opportunity;
        @AuraEnabled public List<String> selectedIds;
        @AuraEnabled public Map<String, List<String>> selectedUnitsParkingUnitsMap;
    }

    private class UpdateParkingUnitsResult {
        List<Units__c> parkingUnits;
        List<String> newOfferIds;

        UpdateParkingUnitsResult(List<Units__c> parkingUnits, List<String> newOfferIds) {
            this.parkingUnits = parkingUnits;
            this.newOfferIds = newOfferIds;
        }
    }

    // ─────────────────────────────────────────
    // Public AuraEnabled Methods
    // ─────────────────────────────────────────

    @AuraEnabled
    public static List<String> createOfferWithSelectedUnits(String payload) {
        CreateOfferSalesProposalData createOfferSalesProposalData = 
            (CreateOfferSalesProposalData) JSON.deserialize(payload, CreateOfferSalesProposalData.class);

        if (createOfferSalesProposalData == null) {
            throw new AuraHandledException('Request payload is null.');
        }
        if (createOfferSalesProposalData.selectedIds == null || createOfferSalesProposalData.selectedIds.isEmpty()) {
            throw new AuraHandledException('No units selected.');
        }

        List<Offer__c> offers = buildOffers(createOfferSalesProposalData);

        if (offers.isEmpty()) {
            return new List<String>();
        }

        insert offers;

        UpdateParkingUnitsResult parkingResult = updateParkingUnits(offers, createOfferSalesProposalData);
        if (!parkingResult.parkingUnits.isEmpty()) {
            update parkingResult.parkingUnits;
        }

        List<Offer__c> offersToUpdate = updateOfferTotals(offers);
        if (!offersToUpdate.isEmpty()) {
            update offersToUpdate;
        }

        return parkingResult.newOfferIds;
    }

    // ─────────────────────────────────────────
    // Private — Build Offers
    // ─────────────────────────────────────────

    private static List<Offer__c> buildOffers(
        CreateOfferSalesProposalData createOfferSalesProposalData
    ) {
        Id countryId = getDefaultCountryId();

        List<Units__c> units = [
            SELECT Id, Unit_Price__c, Tax_Code__c, Default_Payment_Plan__c
            FROM Units__c
            WHERE Id IN :createOfferSalesProposalData.selectedIds
        ];

        if (createOfferSalesProposalData.enqRecordId != null) {
            return buildOffersFromEnquiry(units, createOfferSalesProposalData.enqRecordId, countryId);
        }

        if (createOfferSalesProposalData.opportunity != null) {
            return buildOffersFromOpportunity(units, createOfferSalesProposalData.opportunity, countryId);
        }

        return new List<Offer__c>();
    }

    private static List<Offer__c> buildOffersFromEnquiry(
        List<Units__c> units,
        String enquiryId,
        Id countryId
    ) {
        Enquiry__c enquiry = [
            SELECT Id, Account__c, Contact__c, Customer_Type__c, Stage__c
            FROM Enquiry__c
            WHERE Id = :enquiryId
        ];

        List<Offer__c> offers = new List<Offer__c>();
        for (Units__c unit : units) {
            offers.add(new Offer__c(
                Unit__c                  = unit.Id,
                Enquiry__c               = enquiry.Id,
                Account__c               = enquiry.Account__c,
                Contact__c               = enquiry.Contact__c,
                Tax_Code__c              = unit.Tax_Code__c,
                Country__c               = countryId,
                Payment_Plan_Template__c = unit.Default_Payment_Plan__c,
                Customer_Type__c         = enquiry.Customer_Type__c,
                Valid_from__c            = Date.today(),
                Valid_to__c              = Date.today().addDays(7)
            ));
        }

        enquiry.Stage__c = 'Offer';
        update enquiry;

        return offers;
    }

    private static List<Offer__c> buildOffersFromOpportunity(
        List<Units__c> units,
        String opportunityId,
        Id countryId
    ) {
        Opportunity opp = [
            SELECT Id, AccountId, Customer_Type__c, Interested_In_Project__c, Originating_Lead__c
            FROM Opportunity
            WHERE Id = :opportunityId
        ];

        List<Offer__c> offers = new List<Offer__c>();
        for (Units__c unit : units) {
            offers.add(new Offer__c(
                Unit__c                  = unit.Id,
                Opportunity__c           = opp.Id,
                Account__c               = opp.AccountId,
                Tax_Code__c              = unit.Tax_Code__c,
                Country__c               = countryId,
                Payment_Plan_Template__c = unit.Default_Payment_Plan__c,
                Customer_Type__c         = opp.Customer_Type__c,
                Valid_from__c            = Date.today(),
                Valid_to__c              = Date.today().addDays(7),
                Project__c               = opp.Interested_In_Project__c,
                Originating_Lead__c      = opp.Originating_Lead__c
            ));
        }

        return offers;
    }

    // ─────────────────────────────────────────
    // Private — Update Parking Units
    // ─────────────────────────────────────────

    private static UpdateParkingUnitsResult updateParkingUnits(
        List<Offer__c> offers,
        CreateOfferSalesProposalData createOfferSalesProposalData
    ) {
        List<Units__c> parkingUnits = new List<Units__c>();
        List<String> newOfferIds = new List<String>();

        for (Offer__c offer : offers) {
            newOfferIds.add(offer.Id);

            if (createOfferSalesProposalData.selectedUnitsParkingUnitsMap == null) continue;

            List<String> parkingIds = createOfferSalesProposalData.selectedUnitsParkingUnitsMap.get(offer.Unit__c);
            if (parkingIds == null || parkingIds.isEmpty()) continue;

            for (String parkingId : parkingIds) {
                parkingUnits.add(new Units__c(
                    Id             = parkingId,
                    Parent_Unit__c = offer.Unit__c,
                    Status__c      = 'Under Offer'
                ));
            }
        }

        return new UpdateParkingUnitsResult(parkingUnits, newOfferIds);
    }

    // ─────────────────────────────────────────
    // Private — Update Offer Totals
    // ─────────────────────────────────────────

    private static List<Offer__c> updateOfferTotals(List<Offer__c> offers) {
        Set<Id> unitIds = new Set<Id>();
        for (Offer__c offer : offers) {
            unitIds.add(offer.Unit__c);
        }

        Map<Id, Decimal> parkingPriceSumByUnitId = new Map<Id, Decimal>();
        for (Units__c parking : [
            SELECT Id, Unit_Price__c, Parent_Unit__c
            FROM Units__c
            WHERE Parent_Unit__c IN :unitIds
        ]) {
            Decimal current = parkingPriceSumByUnitId.get(parking.Parent_Unit__c);
            parkingPriceSumByUnitId.put(
                parking.Parent_Unit__c,
                (current == null ? 0 : current) + parking.Unit_Price__c
            );
        }

        List<Offer__c> offersToUpdate = new List<Offer__c>();
        for (Offer__c offer : offers) {
            offersToUpdate.add(new Offer__c(
                Id = offer.Id,
                Total_Parking_Units_Price_Excluding_Tax__c = parkingPriceSumByUnitId.get(offer.Unit__c)
            ));
        }

        return offersToUpdate;
    }

    // ─────────────────────────────────────────
    // Private — Helpers
    // ─────────────────────────────────────────

    private static Id getDefaultCountryId() {
        List<Country__c> countries = [SELECT Id FROM Country__c LIMIT 1];
        if (countries.isEmpty()) {
            throw new AuraHandledException('No Country record found.');
        }
        return countries[0].Id;
    }
}