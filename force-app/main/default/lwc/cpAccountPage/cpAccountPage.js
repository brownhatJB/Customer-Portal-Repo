/*******************************************************
 * File: cpUnitSale.cls
 * Author: JOUHAR C (jouhar@metadatacorp.com)
 * Date: 13-02-2026
 * Description: 
 * Last Modified By: JOUHAR C
 * Last Modified Date: 
 *******************************************************/

import { LightningElement, wire, track } from 'lwc';
import USER_ID from '@salesforce/user/Id';
import { getRecord } from 'lightning/uiRecordApi';
import CONTACT_ID_FIELD from '@salesforce/schema/User.ContactId';
import ACCOUNT_ID_FIELD from '@salesforce/schema/Contact.AccountId';

const NAV_ITEMS = [
    { id: 'profile',    label: 'Profile',    icon: '◈' },
    { id: 'documents',  label: 'Documents',  icon: '◻' },
    { id: 'enquiries',  label: 'Enquiries',  icon: '◎' },
    { id: 'offers',     label: 'Offers',     icon: '◇' },
    { id: 'purchases',  label: 'Purchases',  icon: '◉' },
];

export default class CpAccountPage extends LightningElement {
    accountId;
    contactId;

    @track activeTab = 'profile';

    get navItems() {
        return NAV_ITEMS.map(item => ({
            ...item,
            cssClass: `nav-btn${this.activeTab === item.id ? ' active' : ''}`
        }));
    }

    handleNavClick(event) {
        this.activeTab = event.currentTarget.dataset.id;
    }

    get isProfile()    { return this.activeTab === 'profile'; }
    get isDocuments()  { return this.activeTab === 'documents'; }
    get isEnquiries()  { return this.activeTab === 'enquiries'; }
    get isOffers()     { return this.activeTab === 'offers'; }
    get isPurchases()  { return this.activeTab === 'purchases'; }

    @wire(getRecord, { recordId: USER_ID, fields: [CONTACT_ID_FIELD] })
    wiredUser({ data, error }) {
        if (data) this.contactId = data.fields.ContactId.value;
        if (error) console.error(error);
    }

    @wire(getRecord, { recordId: '$contactId', fields: [ACCOUNT_ID_FIELD] })
    wiredContact({ data, error }) {
        if (data) this.accountId = data.fields.AccountId.value;
        if (error) console.error(error);
    }
}