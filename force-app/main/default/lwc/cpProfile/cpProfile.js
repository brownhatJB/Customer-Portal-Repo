/*******************************************************
 * File: cpUnitSale.cls
 * Author: JOUHAR C (jouhar@metadatacorp.com)
 * Date: 13-02-2026
 * Description: 
 * Last Modified By: JOUHAR C
 * Last Modified Date: 
 *******************************************************/

import { LightningElement, wire } from 'lwc';
import USER_ID from '@salesforce/user/Id';
import { getRecord } from 'lightning/uiRecordApi';
import { refreshApex } from '@salesforce/apex';
import getContactProfileImage from '@salesforce/apex/GetContactDetailsAction.getContactProfileImage';
import getProfileDocument from '@salesforce/apex/GetContactDetailsAction.getProfileDocument';


const USER_FIELDS = ['User.ContactId','User.Username'];
const CONTACT_FIELDS = ['Contact.FirstName', 'Contact.LastName'];

export default class CpProfile extends LightningElement {
    userId = USER_ID;
    contactId;
    username;
    contactName;
    profileImageUrl;
    wiredImageResult;
    showToast = false;
    toastTimeout;
    showUploadModal = false;
    profileDocumentId;
    isLoaded = false;
    isEditMode = false;

    @wire(getRecord, { recordId: '$userId', fields: USER_FIELDS })
    wiredUser({ data }) {
        if (data) {
            this.contactId = data.fields.ContactId.value;
            this.username = data.fields.Username.value;
            this.isLoaded = true;
            console.log('Contact Id: ', this.contactId);
        }
    }

    @wire(getRecord, { recordId: '$contactId', fields: CONTACT_FIELDS })
    wiredContact({ data }) {
        if(data){
            const first = data.fields.FirstName?.value || '';
            const last = data.fields.LastName?.value || '';
            this.contactName = `${first} ${last}`.trim();
        }
    }

    get hasContactId() {
        return this.contactId;
    }

    @wire(getContactProfileImage, { contactId: '$contactId' })
    wiredImage(result) {
        this.wiredImageResult = result;
        console.log('Image Result:',JSON.stringify(this.wiredImageResult));

        if (result.data) {
            this.profileImageUrl = result.data;
        }
    }

        @wire(getProfileDocument, { contactId: '$contactId' })
        wiredDoc({data}) {
            if(data){
                this.profileDocumentId = data;
                console.log('profile document id:',this.profileDocumentId);
            }
        }




    enableEdit() {
        this.isEditMode = true;
    }

    cancelEdit() {
        this.isEditMode = false;
    }

    handleSuccess() {
        this.isEditMode = false;
    }

    handleError(event) {
        console.error("update failed", event.detail);
    }

    get initials() {
        console.log('profile picture fallback name:',this.contactName);
        if (!this.contactName) return 'U';

        return this.contactName
            .split(' ')
            .map(n => n[0])
            .join('')
            .toUpperCase();
    }

    handleImageError(event) {
    console.log('Image failed to load:', event.target.src);
}

        openUploadModal() {
        this.showUploadModal = true;
        console.log('Document Id being passed:', this.profileDocumentId);
    }

    closeUploadModal() {
        this.showUploadModal = false;
    }

   handleProfileUploaded(event) {

    console.log('New Profile URL:', event.detail.imageUrl );

    if (event.detail && event.detail.imageUrl) {
        this.profileImageUrl = event.detail.imageUrl;
    }

    this.showUploadModal = false;

    this.showToast = true;

    clearTimeout(this.toastTimeout);
    this.toastTimeout = setTimeout(() => {
        this.showToast = false;
    }, 3000);

    if (this.wiredImageResult) {
        refreshApex(this.wiredImageResult);
    }
}
}