import { LightningElement } from 'lwc';
import isGuest from '@salesforce/user/isGuest'
import { loadScript } from 'lightning/platformResourceLoader';
import GSAP from '@salesforce/resourceUrl/gsap_lib';
import getContactId from '@salesforce/apex/UserUtil.getContactId';
import { subscribe, unsubscribe, getPendingScroll, clearPendingScroll } from 'c/pubsub';

export default class CpLandingPage extends LightningElement {
    isGuestUser = isGuest;
    userType = 'Guest';
    contactId = null;

    isLoaded = false;

    _scrollHandler = (data) => this.handleScroll(data);

    renderedCallback() {
        if(this.isLoaded) return;
        this.isLoaded = true;

        console.log('renderedCallback fired');
        console.log('globalThis._pendingScroll at renderedCallback:', globalThis._pendingScroll); // check raw value

        loadScript(this, GSAP + '/gsap.min.js')
        .then(() => {
            this.initIntro();

            console.log('inside .then - checking pending'); // is this firing?
            const pending = getPendingScroll();
            console.log('pending value:', pending);

            if (pending) {
                clearPendingScroll();
                setTimeout(() => this.handleScroll({ section: pending }), 2000);
            }
        });

        this.initilizeUserContext();
    }

    initIntro() {
        const intro = this.template.querySelector('.page-intro');
        const wrapper = this.template.querySelector('.landing-wrapper');
        const hero = this.template.querySelector('c-hero-section');


        const tl = gsap.timeline({
            defaults: { ease: "power4.inOut" }
        });

        tl.to({}, { duration: 1.5 }) // pause (like delay)
        
        .to(intro, {
            duration: 1.2,
            y: "-100%"   // SLIDE UP
        })

        .to(wrapper, {
            opacity: 1,
            duration: 0.6,
            ease: "power2.out"
        }, "-=0.6")

        .set(intro, { display: "none" })

        .add(() => {
            hero.startHeroAnimations();
        })

    }

    async initilizeUserContext() {
        try {
            if(!isGuest) {
                this.userType = 'Authenticated';

                const result = await getContactId();
                this.contactId = result;
            }
            console.log('User Type: ', this.userType);
            console.log('Contact Id: ', this.contactId);
            this.loadMessaging();
        } catch(error) {
            console.error('error fetching user context', error);
        }
    }

    loadMessaging() {

        const setPrechatFields = () => {
            try {
                window.embeddedservice_bootstrap.prechatAPI.setHiddenPrechatFields({
                    userType: this.userType,
                    contactId: this.contactId
                });

                console.log('Prechat fields set:', {
                    userType: this.userType,
                    contactId: this.contactId
                });

            } catch (error) {
                console.error('Failed to set prechat fields:', error);
            }
        };

        // Listen for Messaging Ready Event
        window.addEventListener(
            'onEmbeddedMessagingReady',
            () => {
                console.log('Messaging is READY');
                setPrechatFields();
            },
            { once: true } // ensures it runs only once
        );
    }
    

    connectedCallback() {
        console.log('landingPage connectedCallback - subscribing'); // debug
        subscribe('scrolltosection', this._scrollHandler);

        window.addEventListener('popstate', this.handleJourneyUrlChange.bind(this));
        window.addEventListener('navigatejourneys', this.handleJourneyUrlChange.bind(this));
    }

    disconnectedCallback() {
        unsubscribe('scrolltosection', this._scrollHandler);

        window.removeEventListener('popstate', this.handleJourneyUrlChange.bind(this));
        window.removeEventListener('navigatejourneys', this.handleJourneyUrlChange.bind(this));
    }

    handleScroll(data) {
        console.log('handleScroll fired:', data);
        const scrollTo = this.template.querySelector(`[data-id="${data.section}"]`);
        console.log('scrollTo element:', scrollTo);
        if (scrollTo) {
            scrollTo.scrollIntoView({ behavior: 'smooth' });
        }
    }

    handleJourneyUrlChange() {
        const params = new URLSearchParams(window.location.search);

        const enquiryId = params.get('enquiryId');

        console.log('URL changed → enquiryId:', enquiryId);

        if(enquiryId) {
            this.recievedEnquiryId = enquiryId;
            this.showJourneyDetail = true;
        } else {
            this.recievedEnquiryId = null;
            this.showJourneyDetail = false;
        }

    }
}