import { LightningElement, api, wire, track } from 'lwc';

import getUnitDetails from '@salesforce/apex/CpUnitsController.getUnitDetails';
import toggleFavourite from '@salesforce/apex/cpShortlistUnitsController.toggleFavourite';
import isUnitFavourited from '@salesforce/apex/cpShortlistUnitsController.isUnitFavourited';
import { CurrentPageReference } from 'lightning/navigation';
import USER_ID from '@salesforce/user/Id';
import { getRecord } from 'lightning/uiRecordApi';
const USER_FIELDS = ['User.ContactId'];

import img1 from '@salesforce/resourceUrl/terrace';
import img2 from '@salesforce/resourceUrl/pool';
import img3 from '@salesforce/resourceUrl/gardenVilla';

export default class CpUnitScreen extends LightningElement {

    @api unitId;

    @track unit = {};
    @track showImg = true;
    @track currentSlide = 0;
    @track isFavourited = false;
    lastUrl;
    userId = USER_ID;
    

    images = [
        { id: 0, url: img1, alt: 'Terrace View',     dotClass: 'dot active' },
        { id: 1, url: img2, alt: 'Pool View',         dotClass: 'dot' },
        { id: 2, url: img3, alt: 'Garden Villa View', dotClass: 'dot' },
    ];

    // ── Lifecycle ──────────────────────────────────────────────────────────

    connectedCallback() {

        this.loadUnit();

        this.lastUrl = window.location.href;
        this.urlWatcher = setInterval(() => {
            if (this.lastUrl !== window.location.href) {
                this.lastUrl = window.location.href;

                console.log('URL changed detected');

                this.handleUrlChange();
            }
        }, 200); // check every 200ms

        
    }

    @wire(getRecord, {
    recordId: '$userId',
    fields: USER_FIELDS
})

wiredUser({ data, error }) {

    if (data) {

        this.contactId =
            data.fields.ContactId.value;

        console.log(
            'Contact Id:',
            this.contactId
        );
    }

    isUnitFavourited({

            unitId: this.unitId,
            contactId: this.contactId

        }).then((result) => {

            this.isFavourited = result;
        });


    if (error) {

        console.error(
            'Contact Fetch Error:',
            error
        );
    }
}

    // Re-fetch whenever unitId changes from parent
    @api
    get unitIdProp() {
        return this.unitId;
    }
    set unitIdProp(value) {
        this.unitId = value;
        this.loadUnit();
    }

    // ── Data ───────────────────────────────────────────────────────────────

    loadUnit() {
        if (!this.unitId) return;
        getUnitDetails({ unitId: this.unitId })
            .then(result => {
                this.unit = result;
            })
            .catch(error => {
                console.error('Error loading unit:', error);
            });
    }

    // ── Computed ───────────────────────────────────────────────────────────

    get formattedPrice() {
        if (!this.unit || !this.unit.Unit_Price__c) return '—';
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            maximumFractionDigits: 0
        }).format(this.unit.Unit_Price__c);
    }

    get carouselTrackStyle() {
        return `transform: translateX(-${this.currentSlide * 100}%);`;
    }

    get imgBtnClass() {
        return this.showImg ? 'toggle-btn active' : 'toggle-btn';
    }

    get twodBtnClass() {
        return !this.showImg ? 'toggle-btn active' : 'toggle-btn';
    }

    // ── Media Toggle ───────────────────────────────────────────────────────

    showImages() {
        this.showImg = true;
    }

    show2D() {
        this.showImg = false;
    }

    // ── Carousel ───────────────────────────────────────────────────────────

    prevSlide() {
        this.currentSlide = (this.currentSlide - 1 + this.images.length) % this.images.length;
        this.updateDots();
    }

    nextSlide() {
        this.currentSlide = (this.currentSlide + 1) % this.images.length;
        this.updateDots();
    }

    goToSlide(event) {
        const index = parseInt(event.target.dataset.index, 10);
        this.currentSlide = index;
        this.updateDots();
    }

    updateDots() {
        this.images = this.images.map(img => ({
            ...img,
            dotClass: img.id === this.currentSlide ? 'dot active' : 'dot'
        }));
    }


   
    // ── Favourite ──────────────────────────────────────────────────────────

    handleFavourite() {
            console.log('Favourite Clicked');

    if (!this.contactId) {

        this.isFavourited = !this.isFavourited;

        console.log('Guest User - UI only toggle');

        return;
    }
    this.isFavourited = !this.isFavourited;

    


    console.log('Unit Id:', this.unitId);

    console.log('Contact Id:', this.contactId);

    console.log(
        'Favourite State:',
        this.isFavourited
    );

    toggleFavourite({

        unitId: this.unitId,
        contactId: this.contactId,
        isFav: this.isFavourited
    })

    .then(() => {

        console.log(
            'Favourite synced successfully'
        );

    })

    .catch((error) => {

    console.error(
        'Favourite Error:',
        JSON.stringify(error)
    );

    this.isFavourited =
        !this.isFavourited;

    console.log(
        'ui rollback',
        this.isFavourited
    );
});
}

    // ── Actions ────────────────────────────────────────────────────────────

    handleFlyer() {
        if (this.unit && this.unit.Id) {
            // Placeholder — download / open flyer logic
            console.log('Flyer requested for unit:', this.unit.Id);
        }
    }

    handleFloorPlan() {
        if (this.unit && this.unit.Floor_Plan__c) {
            window.open(this.unit.Floor_Plan__c, '_blank');
        }
    }

    handleUrlChange() {
        console.log('URL changed, checking for unitId...');
        const params = new URLSearchParams(window.location.search);
        const unitId = params.get('unitId');

        if(!unitId) {
            window.location.reload();
        }
    }

}