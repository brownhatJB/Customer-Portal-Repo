import { LightningElement, wire, track } from 'lwc';
import getProjectsWithAssets from '@salesforce/apex/cpProjectGalleryController.getProjectsWithAssets';
import { NavigationMixin } from 'lightning/navigation';
import isGuest from '@salesforce/user/isGuest';


export default class CpHorizontalGallery extends NavigationMixin(LightningElement) {

    @track items = [];
    @track visibleItems = [];

    error;
    isLoading = true;

    //  Slider config
    startIndex = 0;
    itemsPerPage = 3;

    // Modal
    isLeadModalOpen = false;
    selectedProjectName = '';
    selectedProjectId;

    isGuestUser = isGuest;

    //  Fetch data
    @wire(getProjectsWithAssets, { limitSize: 30 })
    wiredProjects({ data, error }) {
        if (data) {
            console.log(JSON.stringify(data))
            this.items = (data || []).filter(i => i.imageUrl);
            this.error = undefined;
            this.isLoading = false;

            this.updateVisibleItems(); 

        } else if (error) {
            this.error = error;
            this.items = [];
            this.isLoading = false;
            console.error('Error loading projects:', error);
        }
    }

    //  Update visible items (core logic)
    updateVisibleItems() {

    this.visibleItems = [];

    for (let i = 0; i < this.itemsPerPage; i++) {

        const index =
            (this.startIndex + i) % this.items.length;

        this.visibleItems.push(
            this.items[index]
        );
    }
    }
    handleNext() {

    this.startIndex =
        (this.startIndex + this.itemsPerPage)
        % this.items.length;

    this.updateVisibleItems();
    }

    handlePrev() {

    this.startIndex =
        (
            this.startIndex
            - this.itemsPerPage
            + this.items.length
        ) % this.items.length;

    this.updateVisibleItems();
    }

    //  Modal open
    handleCreateLead(event) {
        this.selectedProjectName = event.currentTarget.dataset.projectName;
        this.selectedProjectId = event.currentTarget.dataset.id;
        this.isLeadModalOpen = true;
    }

    handleModalClose() {
        this.isLeadModalOpen = false;
    }

    //  Download
    handleDownload(event) {
        const url = event.currentTarget.dataset.url;
        if (url) {
            window.open(url, '_self');
        }
    }
}