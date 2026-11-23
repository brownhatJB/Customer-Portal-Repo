/*******************************************************
 * File: cpUnitSelection.js
 * Author: JOUHAR C (jouhar@metadatacorp.com)
 * Date: 06-05-2026
 * Description: 
 * Last Modified By: JOUHAR C
 * Last Modified Date: 
 *******************************************************/

import { LightningElement, wire, api } from 'lwc';
import getAvailableUnits from '@salesforce/apex/UnitsTableController.getAvailableUnits';
import getActiveProjects from '@salesforce/apex/UnitsTableController.getActiveProjects';
import getOpportunityDetails from '@salesforce/apex/GetMyEnquiries.getOpportunityDetails';
import createOfferWithSelectedUnits from '@salesforce/apex/CpCreateOfferController.createOfferWithSelectedUnits';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

export default class CpUnitSelection extends LightningElement {
    units = [];
    projects = [];
    selectedType = 'All';
    @api selectedProject;
    selectedIds = new Set();
    opportunity;
    @api enquiryId;

    @wire(getActiveProjects)
    wiredProjects({ data, error}) {
        if(data) {
            this.projects = data;
            console.log(JSON.stringify(data));
        }
        if(error) {
            console.error(error);
        }
    }

    @wire(getAvailableUnits, {unitType: '$selectedType', projectId : '$selectedProject'})
    wiredUnits({data, error}) {
        if(data) {
            this.units = data.map(unit => ({
                ...unit,
                checked: this.selectedIds.has(unit.Id)
            }));
        } 
        if(error) {
            console.error(error);
        }
    }

    handleFilterClick(event) {
        const newType = event.target.dataset.type;
        
        if(newType === this.selectedType){
            return;
        }

        this.selectedType = newType;

        console.log(this.selectedType)
    }

    handleProjectClick(event) {
        const newProject = event.target.dataset.id;

        if (newProject === this.selectedProject) return;
        this.selectedProject = newProject;

        console.log(this.selectedProject);
    }

    get allClass() {
        return this.selectedType === 'All' ? 'filter active' : 'filter';
    }

    get apartmentClass() {
        return this.selectedType === 'Apartment' ? 'filter active' : 'filter';
    }
    
    get officeClass() {
        return this.selectedType === 'Office' ? 'filter active' : 'filter';
    }

    get villaClass() {
        return this.selectedType === 'Villa' ? 'filter active' : 'filter';
    }

    get projectsWithClass() {
        return this.projects.map(p => ({
            ...p,
            buttonClass: this.selectedProject === p.Id ? 'project-filter project-active' : 'project-filter'
        }));
    }

    get allProjectClass() {
        return this.selectedProject === 'All' ? 'project-filter project-active' : 'project-filter';
    }

    // handleUnitClick(event) {
    //     console.log('Inside handleUnitClick() method')
    //     this.selectedUnitId = event.currentTarget.dataset.id;
    //     console.log('unitId: ', this.selectedUnitId);
       
    //     const selectEvent = new CustomEvent('unitselect', {
    //         detail: {unitId: this.selectedUnitId}
    //     });

    //     this.dispatchEvent(selectEvent);
    // }

    handleRowSelect(event) {
        const unitId = event.target.dataset.id;
        const checked = event.target.checked;

        console.log('selected row unitId: ', unitId)

        if(checked) {
            this.selectedIds.add(unitId);
        } else {
            this.selectedIds.delete(unitId);
        }

        this.units = this.units.map(unit => {
            if(unit.Id == unitId) {
                return {...unit, checked};
            }
            return unit;
        });
    }

    handleSelectAll(event) {
        const checked = event.target.checked;

        this.selectedIds.clear();

        this.units = this.units.map(unit => {
            if(checked) {
                this.selectedIds.add(unit.Id);
            }
            return {...unit, checked};
        });

        console.log('Selected Ids after select all: ', this.selectedIds);
    }

    get isAllSelected() {
        return this.units.length > 0 && this.selectedIds.size === this.units.length;
    }

    @wire(getOpportunityDetails, {enquiryId: '$enquiryId'})
    wiredOpportunity({data, error}) {
        if(data) {
            this.opportunity = data;
            console.log('Opportunity details in unit selection: ', JSON.stringify(this.opportunity, null, 4));
        }
        if(error) {
            console.error('error fetching opportunity details', error);
        }
    }


    async handleCreateOffer() {
        try {
            const createOfferSalesProposalData = {
                enqRecordId: null,
                opportunity: this.opportunity?.Id,
                selectedIds: Array.from(this.selectedIds),
                selectedUnitsParkingUnitsMap: {}
            };

            console.log('Payload for creating offer: ', JSON.stringify(createOfferSalesProposalData, null, 4));
            
            const result = await createOfferWithSelectedUnits({ 
                payload: JSON.stringify(createOfferSalesProposalData) 
            });
            console.log('Offers created:', result);

            this.dispatchEvent(new ShowToastEvent({
                title: 'Offer(s) Created',
                message: `${result.length} offer(s) have been created successfully.`,
                variant: 'success'
            }));

            const afterOfferEvent = new CustomEvent('offercreated', {
                detail: {offerIds: result},
                bubbles: true,
                composed: true
            });
            this.dispatchEvent(afterOfferEvent);

        } catch (error) {
            console.error('Error:', error);
            this.dispatchEvent(new ShowToastEvent({
                title: 'Error',
                message: 'An error occurred while creating the offer(s).',
                variant: 'error'
            }));
        }
    }
}