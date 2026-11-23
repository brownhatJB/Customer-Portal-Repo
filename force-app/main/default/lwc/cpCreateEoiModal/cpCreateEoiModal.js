import { LightningElement,api } from 'lwc';
import isGuest from '@salesforce/user/isGuest';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import createEOI from '@salesforce/apex/CpEoiPortalController.createEOI';
import getProjects from '@salesforce/apex/CpEoiPortalController.getProjects';
import getProperties from '@salesforce/apex/CpEoiPortalController.getProperties';
import getUnitTypes from '@salesforce/apex/CpEoiPortalController.getUnitTypes';
import getMyContactDetails from '@salesforce/apex/CpEoiPortalController.getMyContactDetails';
import calculateEoiAmount from '@salesforce/apex/CpEoiPortalController.calculateEoiAmount';

export default class CpCreateEoiModal extends LightningElement {

    @api guestEmail;

    firstName = '';
    lastName = '';
    email = '';
    phone = '';

    projectName = '';
    propertyName = '';
    eoiAmount;

    projectOptions = [];
    propertyOptions = [];
    unitTypeOptions = [];

    selectedProject = '';
    selectedProjectName = '';
    selectedProperty = '';
    selectedUnitType = '';
    eoiAmount = 0;

    get isGuestUser() {
    return isGuest;
    }

    connectedCallback() {
        this.loadProjects();
          if (this.isGuestUser && this.guestEmail) {
        this.email = this.guestEmail;
        } else {
            this.loadContactDetails();
        }
    }

    loadContactDetails() {
        getMyContactDetails()
            .then(contact => {

                if (contact) {
                    this.firstName = contact.FirstName || '';
                    this.lastName = contact.LastName || '';
                    this.email = contact.Email || '';
                    this.phone = contact.Phone || '';
                }

            })
            .catch(error => {
                console.error(
                    'Error loading contact details:',
                    JSON.stringify(error)
                );
            });
    }

    loadProjects() {
        getProjects()
            .then(result => {
                this.projectOptions = result.map(project => ({
                    label: project.Name,
                    value: project.Id
                }));
            })
            .catch(error => {
                console.error('Error loading projects:', error);
            });
    }

    loadProperties(projectId) {
        getProperties({ projectId })
            .then(result => {
                this.propertyOptions = result.map(property => ({
                    label: property.Name,
                    value: property.Id
                }));
            })
            .catch(error => {
                console.error('Error loading properties:', error);
                this.propertyOptions = [];
            });
    }

    loadUnitTypes(propertyId) {
        console.log('Property ID:', propertyId);

        getUnitTypes({ propertyId })
            .then(result => {
                console.log('Unit Types:', result);

                this.unitTypeOptions = result.map(type => ({
                    label: type,
                    value: type
                }));

                console.log('Unit Type Options:', this.unitTypeOptions);
            })
            .catch(error => {
                console.error('Error loading unit types:', error);
                this.unitTypeOptions = [];
            });
    }

    handleFirstNameChange(event) {
        this.firstName = event.target.value;
    }

    handleLastNameChange(event) {
        this.lastName = event.target.value;
    }

    handleEmailChange(event) {
        this.email = event.target.value;
    }

    handlePhoneChange(event) {
        this.phone = event.target.value;
    }

    handleProjectChange(event) {
        this.selectedProject = event.detail.value;

        console.log('Selected Project:', this.selectedProject);

        const selectedProject = this.projectOptions.find(
            project => project.value === this.selectedProject
        );

        this.selectedProjectName =
            selectedProject ? selectedProject.label : '';

        this.selectedProperty = '';
        this.propertyName = '';
        this.selectedUnitType = '';
        this.propertyOptions = [];
        this.unitTypeOptions = [];
        this.eoiAmount = 0;

        if (this.selectedProject) {
            this.loadProperties(this.selectedProject);
        }
    }

    handlePropertyChange(event) {

        this.selectedProperty = event.detail.value;

        console.log('Selected Property:', this.selectedProperty);

        const selectedProperty = this.propertyOptions.find(
            property => property.value === this.selectedProperty
        );

        this.propertyName =
            selectedProperty ? selectedProperty.label : '';

        this.selectedUnitType = '';
        this.unitTypeOptions = [];
        this.eoiAmount = 0;

        if (this.selectedProperty) {
            this.loadUnitTypes(this.selectedProperty);
        }
    }

    handleUnitTypeChange(event) {

        this.selectedUnitType = event.detail.value;

        console.log('Selected Project:', this.selectedProject);
        console.log('Selected Property:', this.selectedProperty);
        console.log('Selected Unit Type:', this.selectedUnitType);

        this.calculateAmount();
    }

    calculateAmount() {
    console.log('--- EOI AMOUNT CALCULATION ---');
    console.log('Project Id:', this.selectedProject);
    console.log('Property Id:', this.selectedProperty);
    console.log('Unit Type:', this.selectedUnitType);

    if (
        !this.selectedProject ||
        !this.selectedProperty ||
        !this.selectedUnitType
    ) {
        console.log('Missing selection. Amount = 0');
        this.eoiAmount = 0;
        return;
    }

    calculateEoiAmount({
            projectId: this.selectedProject,
            propertyId: this.selectedProperty,
            unitType: this.selectedUnitType
        })
        .then(result => {
            console.log('Apex returned amount:', result);

            this.eoiAmount = result || 0;

            console.log('LWC EOI Amount:', this.eoiAmount);
        })
        .catch(error => {
            console.error(
                'EOI amount calculation error:',
                JSON.stringify(error)
            );

            this.eoiAmount = 0;
        });
    }

    handleAmountChange(event) {
        this.eoiAmount = event.target.value;
    }

    handleClose() {
        this.dispatchEvent(new CustomEvent('close'));
    }

    handleCreate() {

        if (
            !this.selectedProject ||
            !this.selectedProperty ||
            !this.selectedUnitType ||
            !this.eoiAmount
        ) {
            return;
        }

        createEOI({
            projectId: this.selectedProject,
            propertyId: this.selectedProperty,
            unitName: this.selectedUnitType,
            eoiAmount: Number(this.eoiAmount),
            firstName: this.firstName,
            lastName: this.lastName,
            email: this.email,
            phone: this.phone
        })
            .then(() => {

                this.dispatchEvent(
                    new ShowToastEvent({
                        title: 'Success',
                        message: 'EOI created successfully.',
                        variant: 'success'
                    })
            );

                this.dispatchEvent(
                    new CustomEvent('created')
                );

                setTimeout(() => {
                window.location.reload();
                 }, 1500);
            })
            .catch(error => {
                console.error(
                    'Error creating EOI:',
                    JSON.stringify(error)
                );

                const message =
                    error?.body?.message ||
                    error?.body?.pageErrors?.[0]?.message ||
                    'Unable to create EOI.';

                console.error('EOI Error Message:', message);
            });
    }
}