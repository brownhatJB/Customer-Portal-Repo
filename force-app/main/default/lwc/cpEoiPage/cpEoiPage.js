import { LightningElement } from 'lwc';  
import isGuest from '@salesforce/user/isGuest';  
import generateMagicLink from '@salesforce/apex/CpEoiGuestSessionController.generateMagicLink';  
import validateToken from '@salesforce/apex/CpEoiGuestSessionController.validateToken';  
import getEmailFromToken from '@salesforce/apex/CpEoiGuestSessionController.getEmailFromToken';  
  
export default class CpEoiPage extends LightningElement {  
  
    selectedEoiId;  
    showDetails = false;  
  
    isGuestUser = isGuest;  
    guestVerified = false;  
    tokenValidated = false;  
    verifiedGuestEmail;  
  
  
    connectedCallback() {  
        console.log('EOI Page: connectedCallback - isGuestUser:', this.isGuestUser); 
        console.log('EOI Page: stored token exists:', !!sessionStorage.getItem('eoiToken')); 
 
        this.handleEoiUrlChange();  
  
        window.addEventListener('popstate', this.handleEoiUrlChange.bind(this));  
        window.addEventListener('navigatetoeoi', this.handleEoiUrlChange.bind(this));  
    }  
  
    disconnectedCallback() {  
  
        window.removeEventListener('popstate', this.handleEoiUrlChange.bind(this));  
        window.removeEventListener('navigatetoeoi', this.handleEoiUrlChange.bind(this));  
    }  
  
    async handleGuestVerified(event) {  
        console.log('EOI Page: Guest verification successful'); 
 
        this.guestVerified = true;  
        const email = event.detail.email;  
  
        try {  
            const rawToken = await generateMagicLink({ email }); 
 
            sessionStorage.setItem('eoiToken', rawToken);  
  
            console.log('EOI Page: token stored:', !!sessionStorage.getItem('eoiToken')); 
 
            const targetUrl = `${window.location.origin}/mdrealty/eoi?token=${rawToken}`;  
  
            window.history.pushState({ path: targetUrl }, '', targetUrl);  
  
            await this.handleEoiUrlChange();  
  
        } catch (error) {  
            console.error('EOI Page: Error generating session token:', error);  
        }  
    }  
  
  
    handleView(event) {  
        console.log('CpEoiPage: view event received');  
        console.log('EOI ID:', event.detail);  
  
        this.selectedEoiId = event.detail;  
        window.history.pushState({}, '', `?eoiId=${this.selectedEoiId}`);  
  
        this.handleEoiUrlChange()  
    }  
  
    handleBack() {  
        window.history.pushState({}, '', '/mdrealty/eoi');  
        this.handleEoiUrlChange();  
    }  
  
    async handleEoiUrlChange() {  
  
        const urlParams = new URLSearchParams(window.location.search);  
        const eoiId = urlParams.get('eoiId');  
        const urlToken = urlParams.get('token');  
        const storedToken = sessionStorage.getItem('eoiToken');  
  
        this.selectedEoiId = eoiId || null;  
        this.showDetails = !!eoiId;  
  
        if (this.isGuestUser && !this.tokenValidated) {  
  
            let token = urlToken || storedToken;  
  
            console.log('EOI Page: token available for validation:', !!token); 
 
            if (token) {  
  
                sessionStorage.setItem('eoiToken', token);  
  
                try {  
                    const isValid = await validateToken({ rawToken: token });  
  
                    console.log('EOI Page: token validation result:', isValid); 
 
                    if (isValid) {  
  
                        this.tokenValidated = true;  
                        this.guestVerified = true;  
  
                        this.verifiedGuestEmail =  await getEmailFromToken({ rawToken: token });  
                        console.log('EOI Page: email from token:', this.verifiedGuestEmail, 'token: ', token);

                        if (!urlParams.has('token')) {
                            const currentUrl = new URL(window.location.href);
                            currentUrl.searchParams.set('token', token);
                            window.history.replaceState(window.history.state, '', currentUrl.toString());
                        }
  
                    } else {  
  
                        console.log('EOI Page: token invalid or expired'); 
 
                        sessionStorage.removeItem('eoiToken');  
  
                        this.guestVerified = false;  
                        this.tokenValidated = false;  
                    }  
  
                } catch (error) {  
                    console.error('EOI Page: Error validating token:', error);  
                }  
  
            } else {  
                console.log('EOI Page: no stored session token'); 
            }  
        }  
    }  
}