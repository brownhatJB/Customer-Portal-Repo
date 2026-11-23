/**
 * @module            : Real_Estate_Module
 * @description       : 
 * @namespace         : 
 * @author            : SREERAM.R
 * @group             : 
 * @last modified on  : 08-31-2026
 * @last modified by  : SREERAM.R
**/
import { LightningElement } from 'lwc';

export default class CpFooter extends LightningElement {

    get currentYear() {
        return new Date().getFullYear();
    }

}