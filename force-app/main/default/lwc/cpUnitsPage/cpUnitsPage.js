/*******************************************************
 * File: cpUnitSale.cls
 * Author: JOUHAR C (jouhar@metadacorp.com)
 * Date: 13-02-2026
 * Description: 
 * Last Modified By: JOUHAR C
 * Last Modified Date: 
 *******************************************************/

import { LightningElement } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';

export default class CpUnitsPage extends  NavigationMixin(LightningElement) {

    selectedUnitId;
    showUnitScreen = false;

    connectedCallback() {
        this.handleUrlChange();

        window.addEventListener('popstate', this.handleUrlChange.bind(this));
    }

    disconnectedCallback() {
        window.removeEventListener('popstate', this.handleUrlChange.bind(this));
    }

    handleUrlChange() {
        const params = new URLSearchParams(window.location.search);
        const unitId = params.get('unitId');

        console.log('URL changed → unitId:', unitId);

        if (unitId) {
            this.selectedUnitId = unitId;
            this.showUnitScreen = true;
        } else {
            this.showUnitScreen = false;
        }
    }

    handleUnitSelect(event) {
        const unitId = event.detail.unitId;

        window.history.pushState({}, '', `?unitId=${unitId}`);

        this.handleUrlChange(); // manually sync UI
    }
}