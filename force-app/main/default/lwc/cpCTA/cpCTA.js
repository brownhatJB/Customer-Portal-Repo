/*******************************************************
 * File: cpUnitSale.cls
 * Author: JOUHAR C (jouhar@metadatacorp.com)
 * Date: 13-02-2026
 * Description: 
 * Last Modified By: JOUHAR C
 * Last Modified Date: 
 *******************************************************/

import { LightningElement } from 'lwc';
import createLead from '@salesforce/apex/CpCTALeadController.createLead';

export default class CpCTA extends LightningElement {

    isSubmitted = false;

    firstName = '';
    lastName = '';
    email = '';
    phone = '';
    company = '';
    description = '';
    errorMessage = '';

    handleChange(event) {
        const field = event.target.dataset.field;
        this[field] = event.target.value;
        this.errorMessage = '';
    }

   async handleSubmit() {
        this.errorMessage = '';

        if (!this.firstName?.trim()) {
            this.errorMessage = 'First Name is required.';
            return;
        }

        if (!this.lastName?.trim()) {
            this.errorMessage = 'Last Name is required.';
            return;
        }

        if (!this.email?.trim()) {
            this.errorMessage = 'Email is required.';
            return;
        }

        if (!this.phone?.trim()) {
            this.errorMessage = 'Mobile is required.';
            return;
        }

        try {
            await createLead({
                firstName: this.firstName,
                lastName: this.lastName,
                email: this.email,
                phone: this.phone,
                company: this.company || '',
                description: this.description
            });

            this.isSubmitted = true;

            requestAnimationFrame(() => {
                const success = this.template.querySelector('.success-state');

                if (success && window.gsap) {
                    window.gsap.from(success, {
                        scale: 0.9,
                        opacity: 0,
                        duration: 0.6,
                        ease: 'power3.out'
                    });
                }
            });

        } catch (error) {
            console.error('Error creating lead', error);
            this.errorMessage =
                error?.body?.message ||
                'Unable to submit the form. Please try again.';
        }
    }
}