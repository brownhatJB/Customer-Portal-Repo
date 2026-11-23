/*******************************************************
 * File: cpUnitSale.cls
 * Author: JOUHAR C (jouhar@metadatacorp.com)
 * Date: 13-02-2026
 * Description: 
 * Last Modified By: JOUHAR C
 * Last Modified Date: 
 *******************************************************/

import { LightningElement, wire } from 'lwc';
import getAvailableUnits from '@salesforce/apex/UnitsTableController.getAvailableUnits';
import getActiveProjects from '@salesforce/apex/UnitsTableController.getActiveProjects';
import isGuest from '@salesforce/user/isGuest';
import { NavigationMixin } from 'lightning/navigation';

export default class CpAvailableUnits extends NavigationMixin(LightningElement) {
    units = [];
    projects = [];
    selectedType = 'All';
    selectedProject = 'All';
    isGuestUser = isGuest;

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
            this.units = data;
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

    handleUnitClick(event) {
        console.log('Inside handleUnitClick() method')
        this.selectedUnitId = event.currentTarget.dataset.id;
        console.log('unitId: ', this.selectedUnitId);
       
        const selectEvent = new CustomEvent('unitselect', {
            detail: {unitId: this.selectedUnitId}
        });

        this.dispatchEvent(selectEvent);
    }

    navigateToLogin() {
        this[NavigationMixin.Navigate]({
            type: 'standard__webPage',
            attributes: { url: '/customerlogin' }
        });
    }
}