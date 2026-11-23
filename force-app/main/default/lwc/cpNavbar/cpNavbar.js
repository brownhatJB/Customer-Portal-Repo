import { LightningElement, track } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';
import { loadScript } from 'lightning/platformResourceLoader';
import GSAP_ZIP from '@salesforce/resourceUrl/gsap_lib';
import isGuest from '@salesforce/user/isGuest';
import basePath from '@salesforce/community/basePath';
import { publish, setPendingScroll } from 'c/pubsub';
import getContactId from '@salesforce/apex/UserUtil.getContactId';
import getFirstName from '@salesforce/apex/UserUtil.getFirstName';
import COMMUNITY_ID from '@salesforce/community/Id';

import POOL from '@salesforce/resourceUrl/pool';
import SMART_HOME from '@salesforce/resourceUrl/smartHome';
import PENTHOUSE from '@salesforce/resourceUrl/penthouse';
import VILLA from '@salesforce/resourceUrl/villa';
import TOWER from '@salesforce/resourceUrl/tower';
import TERRACE from '@salesforce/resourceUrl/terrace';
import FAM_HOME from '@salesforce/resourceUrl/famHome';
import KEY_HANDOVER from '@salesforce/resourceUrl/KeyHandover';
import HAND_SHAKE from '@salesforce/resourceUrl/handShake';
import CALL from '@salesforce/resourceUrl/call';
import SIGNING from '@salesforce/resourceUrl/Signing';
import VISIT from '@salesforce/resourceUrl/Visit';
import TWO_BHK from '@salesforce/resourceUrl/twoBhk';
import THREE_BHK from '@salesforce/resourceUrl/threeBhk';
import BEACH_VILLA from '@salesforce/resourceUrl/beachVilla';
import GARDEN_VILLA from '@salesforce/resourceUrl/gardenVilla';


export default class CpNavbar extends NavigationMixin(LightningElement) {

    isGsapInitialized = false;
    navElement = null;
    scrollTriggerInstance = null;
    isGuestUser = isGuest;
    userType = 'Guest';
    contactId = null;
    firstName = '';
    isLoaded = false;
    isMessagingReady = false;
    isUserContextReady = false;


    communityId = COMMUNITY_ID;

    @track showUploadModal = false;
    @track activeDocumentId = null;
    @track activeDocumentType = '';
    @track activeAcceptedFormats = [];

    // MENU DATA (unchanged)
    MENU = {
        // units: [
        //     {
        //         label: "Villas",
        //         page: "units",
        //         gallery: [
        //             {
        //                 image: BEACH_VILLA,
        //                 title: "Beach Villa",
        //                 desc: "Sea facing luxury homes"
        //             },
        //             {
        //                 image: GARDEN_VILLA,
        //                 title: "Garden Villa",
        //                 desc: "Private garden spaces"
        //             }
        //         ]
        //     },
        //     {
        //         label: "Apartments",
        //         page: "units",
        //         gallery: [
        //             {
        //                 image: TWO_BHK,
        //                 title: "2BHK",
        //                 desc: "Affordable modern living"
        //             },
        //             {
        //                 image: THREE_BHK,
        //                 title: "3BHK",
        //                 desc: "Spacious family homes"
        //             }
        //         ]
        //     }
        // ],

        home: [
            {
                label: "Projects",
                page: "/mdrealty/",
                section: "Projects",
                gallery: [
                    {
                        image: TOWER,
                        title: "Luxury Towers",
                        desc: "Premium skyline living"
                    },
                    {
                        image: VILLA,
                        title: "Luxury Villa",
                        desc: "Private Spacious Living"
                    },
                    {
                        image: PENTHOUSE,
                        title: "Luxury Penthouse",
                        desc: "Elevated Skyline Luxury"
                    }
                ]
            },
            {
                label: "Features",
                page: "/mdrealty/",
                section: "Features",
                gallery: [
                    {
                        image: SMART_HOME,
                        title: "Intelligent Systems",
                        desc: "Next-generation smart home technology"
                    },
                    {
                        image: POOL,
                        title: "Infinity Horizons",
                        desc: "Seamless glass-edge pools"
                    },
                    {
                        image: TERRACE,
                        title: "Sculpted Terraces",
                        desc: "Expansive outdoor living spaces"
                    }
                ]
            },
            {
                label: "Testimonials",
                page: "/mdrealty/",
                section: "Testimonials",
                gallery: [
                    {
                        image: FAM_HOME,
                        title: "Dreams Turned Reality",
                        desc: "Transforming dreams into timeless living spaces"
                    },
                    {
                        image: HAND_SHAKE,
                        title: "Trusted Partnerships",
                        desc: "Built on trust and lasting relationships"
                    },
                    {
                        image: KEY_HANDOVER,
                        title: "Happy Homeowners",
                        desc: "Where new beginnings meet refined living"
                    }
                ]
            },
            {
            label: "Get Help",
            page: "/mdrealty/",
            section: "Enquiry",
            gallery: [
                {
                    image: CALL,
                    title: "Seamless Consultation",
                    desc: "Expert guidance tailored to your unique needs"
                },
                {
                    image: VISIT,
                    title: "Personalized Property Tours",
                    desc: "Experience homes curated to match your lifestyle"
                },
                {
                    image: SIGNING,
                    title: "Effortless Ownership Journey",
                    desc: "Smooth transactions with complete trust and transparency"
                }
            ]
        }
        ]
    };

    MENU_GUEST = {
        // units: [
        //     {
        //         label: "Villas",
        //         page: "units",
        //         gallery: [
        //             {
        //                 image: BEACH_VILLA,
        //                 title: "Beach Villa",
        //                 desc: "Sea facing luxury homes"
        //             },
        //             {
        //                 image: GARDEN_VILLA,
        //                 title: "Garden Villa",
        //                 desc: "Private garden spaces"
        //             }
        //         ]
        //     },
        //     {
        //         label: "Apartments",
        //         page: "units",
        //         gallery: [
        //             {
        //                 image: TWO_BHK,
        //                 title: "2BHK",
        //                 desc: "Affordable modern living"
        //             },
        //             {
        //                 image: THREE_BHK,
        //                 title: "3BHK",
        //                 desc: "Spacious family homes"
        //             }
        //         ]
        //     }
        // ],

        home: [
            {
                label: "Projects",
                page: "/mdrealty/",
                section: "Projects",
                gallery: [
                    {
                        image: TOWER,
                        title: "Luxury Towers",
                        desc: "Premium skyline living"
                    },
                    {
                        image: VILLA,
                        title: "Luxury Villa",
                        desc: "Private Spacious Living"
                    },
                    {
                        image: PENTHOUSE,
                        title: "Luxury Penthouse",
                        desc: "Elevated Skyline Luxury"
                    }
                ]
            },
            {
                label: "Features",
                page: "/mdrealty/",
                section: "Features",
                gallery: [
                    {
                        image: SMART_HOME,
                        title: "Intelligent Systems",
                        desc: "Next-generation smart home technology"
                    },
                    {
                        image: POOL,
                        title: "Infinity Horizons",
                        desc: "Seamless glass-edge pools"
                    },
                    {
                        image: TERRACE,
                        title: "Sculpted Terraces",
                        desc: "Expansive outdoor living spaces"
                    }
                ]
            },
            {
                label: "Testimonials",
                page: "/mdrealty/",
                section: "Testimonials",
                gallery: [
                    {
                        image: FAM_HOME,
                        title: "Dreams Turned Reality",
                        desc: "Transforming dreams into timeless living spaces"
                    },
                    {
                        image: HAND_SHAKE,
                        title: "Trusted Partnerships",
                        desc: "Built on trust and lasting relationships"
                    },
                    {
                        image: KEY_HANDOVER,
                        title: "Happy Homeowners",
                        desc: "Where new beginnings meet refined living"
                    }
                ]
            },
            {
            label: "Enquiry",
            page: "/mdrealty/",
            section: "Enquiry",
            gallery: [
                {
                    image: CALL,
                    title: "Seamless Consultation",
                    desc: "Expert guidance tailored to your unique needs"
                },
                {
                    image: VISIT,
                    title: "Personalized Property Tours",
                    desc: "Experience homes curated to match your lifestyle"
                },
                {
                    image: SIGNING,
                    title: "Effortless Ownership Journey",
                    desc: "Smooth transactions with complete trust and transparency"
                }
            ]
        }
        ]
    };

    @track isMegaOpen = false;
    @track accountOpen = false;
    @track activeMenu = null;
    @track activeItem = {};
    @track isHoveringNav = false;
    @track isHoveringPanel = false;
    isHoveringAccount = false;
    isHoveringAccountPanel = false;
    currentPage = '/';

    timeout;

    renderedCallback() {
        if(!this.isLoaded) {
            this.isLoaded = true;
            this.loadMessaging();
            this.initilizeUserContext();
        }

        if (this.isGsapInitialized) return;
        this.isGsapInitialized = true;

        Promise.all([
            loadScript(this, GSAP_ZIP + '/gsap.min.js'),
            loadScript(this, GSAP_ZIP + '/ScrollTrigger.min.js')
        ])
        .then(() => {
            this.initGSAP();
        })
        .catch(error => {
            console.error('GSAP Load Error:', error);
        });
    }

    initGSAP() {
        if (!window.gsap) {
            console.error('GSAP not loaded');
            return;
        }

        window.gsap.registerPlugin(window.ScrollTrigger);

        this.navElement = this.template.querySelector('.nav-inner');
        if (!this.navElement) {
            console.warn('Navbar element (.nav-inner) not found');
            return;
        }

        // Initial entry animation
        window.gsap.from(this.navElement, {
            y: -50,
            opacity: 0,
            duration: 0.5,
            ease: "none"
        });

        // === ScrollTrigger for Navbar Shrink ===
        this.scrollTriggerInstance = ScrollTrigger.create({
            trigger: "body",           // or '.main-content' / your main wrapper if better
            start: "top top",
            end: "top+=120 top",       // Adjust this value based on when you want shrink to complete
            scrub: 0.6,                // Smooth feel (0 = instant, higher = smoother but delayed)
            invalidateOnRefresh: true,

            onUpdate: (self) => {
                const progress = self.progress; // 0 to 1

                if (progress > 0.05) {
                    // Shrunk state
                    window.gsap.to(this.navElement, {
                        width: "1200px",
                        padding: "16px 30px",
                        borderRadius: "16px",
                        marginTop: "20px",
                        background: "rgba(255,255,255,0.6)",
                        backdropFilter: "blur(12px)",
                        boxShadow: "0 10px 40px rgba(0,0,0,0.1)",
                        duration: 0.3,
                        overwrite: "auto"
                    });
                } else {
                    // Full / normal state
                    window.gsap.to(this.navElement, {
                        width: "100%",
                        padding: "20px 40px",
                        borderRadius: "0px",
                        marginTop: "0px",
                        background: "rgba(255,255,255,0.9)",
                        backdropFilter: "blur(5px)",
                        boxShadow: "none",
                        duration: 0.1,
                        overwrite: "auto"
                    });
                }
            }
        });

        // Refresh ScrollTrigger after a short delay (helps in Salesforce dynamic pages)
        setTimeout(() => {
            ScrollTrigger.refresh();
        }, 300);
    }

    // ================== Existing Hover Logic (unchanged) ==================
    handleNavEnter() {
        this.isHoveringNav = true;
        clearTimeout(this.timeout);
    }

    handleNavLeave() {
        this.isHoveringNav = false;
        this.startCloseTimer();
    }

    handlePanelEnter() {
        this.isHoveringPanel = true;
        clearTimeout(this.timeout);
    }

    handlePanelLeave() {
        this.isHoveringPanel = false;
        this.startCloseTimer();
    }

    startCloseTimer() {
        this.timeout = setTimeout(() => {
            if (!this.isHoveringNav && !this.isHoveringPanel) {
                this.animateMega(false);
                this.activeMenu = null;
            }
        }, 200);
    }

    handleEnter(event) {
        clearTimeout(this.timeout);
        this.activeMenu = event.target.dataset.menu;
        const data = this.MENU[this.activeMenu];
        this.isMegaOpen = data ? true : false;
        this.activeItem = data ? data[0] : {};
        this.animateMega(true);
    }

    handleItemHover(event) {
        const label = event.target.dataset.label;
        const data = this.MENU[this.activeMenu];
        if (data) {
            this.activeItem = data.find(item => item.label === label) || {};
        }

        // Optional image fade
        if (window.gsap) {
            window.gsap.fromTo(".card", 
                { opacity: 0.5 }, 
                { opacity: 1, duration: 0.3 }
            );
        }
    }

    handleGuestItemHover(event) {
        const label = event.target.dataset.label;
        const data = this.MENU_GUEST[this.activeMenu];
        if (data) {
            this.activeItem = data.find(item => item.label === label) || {};
        }

        // Optional image fade
        if (window.gsap) {
            window.gsap.fromTo(".card", 
                { opacity: 0.5 }, 
                { opacity: 1, duration: 0.3 }
            );
        }
    }

    animateMega(open) {
        if (!window.gsap) return;

        const mega = this.template.querySelector('.mega');
        if (!mega) return;

        if (open) {
            window.gsap.fromTo(mega,
                { opacity: 0, y: -20 },
                { opacity: 1, y: 0, duration: 0.3 }
            );
        } else {
            window.gsap.to(mega, {
                opacity: 0,
                y: -20,
                duration: 0.2,
                onComplete: () => {
                    this.isMegaOpen = false;
                }
            });
        }
    }

    get activeMenuData() {
        const data = this.MENU[this.activeMenu] || [];

        return data.map(item => ({
            ...item,
            className: `menu-item ${
                this.activeItem.label === item.label ? 'active' : ''
            }`
        }));
    }

    get activeGuestMenuData() {
        const data = this.MENU_GUEST[this.activeMenu] || [];

        return data.map(item => ({
            ...item,
            className: `menu-item ${
                this.activeItem.label === item.label ? 'active' : ''
            }`
        }));
    }

    startAccountCloseTimer() {
        this.timeout = setTimeout(() => {
            if(!this.isHoveringAccount && !this.isHoveringAccountPanel) {
                this.accountOpen = false;
            }
        }, 200);
    }

    showAccountMenu() { 
        this.isHoveringAccount = true;
        this.accountOpen = true; 
    }

    hideAccountMenu() { 
        this.isHoveringAccount = false;
        this.startAccountCloseTimer();
    }

    handleAccountPanelHover() {
        this.isHoveringAccountPanel = true;
    }

    handleAccountPanelLeave() {
        this.isHoveringAccountPanel = false;
        this.startAccountCloseTimer();
    }
    
    connectedCallback() {
        this._openHandler = (e) => this.handleOpenUpload(e);
        window.addEventListener('openchatupload', this._openHandler);

        this.messageHandler = this.handleMessage.bind(this);
        window.addEventListener('message', this.messageHandler);
    }

    // Cleanup (recommended)
    disconnectedCallback() {
        if (this.scrollTriggerInstance) {
            this.scrollTriggerInstance.kill();
        }
        window.removeEventListener('openchatupload', this._openHandler);
        window.removeEventListener('message', this.messageHandler);
    }

    get isHomeActive() {
        return this.activeMenu == 'home';
    }

    get isHomePanelActive() {
        return this.activeMenu == 'home' && this.isMegaOpen;
    }

    get isUnitsActive() {
        return this.activeMenu == 'units';
    }

    get isUnitsPanelActive() {
        return this.activeMenu == 'units' && this.isMegaOpen;
    }

    get isAppointmentsActive() {
        return this.activeMenu == 'appointments';
    }

    get isAppointmentsPanelActive() {
        return this.activeMenu == 'appointments' && this.isMegaOpen;
    }

    get isCasesActive() {
        return this.activeMenu == 'cases';
    }

    get isPurchasesActive() {
        return this.activeMenu == 'purchases';
    }

    get isCasesPanelActive() {
        return this.activeMenu == 'cases' && this.isMegaOpen;
    }

    get isJourneysActive() {
        return this.activeMenu == 'journeys';
    }

    get isEoiActive() {
        return this.activeMenu == 'eoi';
    }

    get logoutLink() {
        if(!isGuest && window.embeddedservice_bootstrap?.userVerificationAPI) {
            window.embeddedservice_bootstrap.userVerificationAPI.clearSession();
        }

        const sitePrefix = basePath.replace("/", "");
        return `/${sitePrefix}/secur/logout.jsp`;
    }

    get accountLink() {
        if(isGuest) {
            this.currentPage = '/customerlogin';
            return '/customerlogin';
        } else {
            this.currentPage = '/account';
            return '/account';
        }
    }

    get appointmentLink() {
        if(isGuest) {
            this.currentPage = '/customerlogin';
            return '/customerlogin';
        } else {
            this.currentPage = '/appointments';
            return '/appointments';
        }
    }

    get caseLink() {
        if(isGuest) {
            this.currentPage = '/customerlogin';
            return '/customerlogin';
        } else {
            this.currentPage = '/case';
            return '/case';
        }
    }

    get purchasesLink() {
        if(isGuest) {
            this.currentPage = '/customerlogin';
            return '/customerlogin';
        } else {
            this.currentPage = '/purchases';
            return '/purchases';
        }
    }

    // get eoiLink() {
    //     return '/eoi';
    // }

    // get journeysLink() {
    //     if(isGuest) {
    //         return '/customerlogin';
    //     } else {
    //         return '/journeys';
    //     }
    // }

    scrollToSection(event) {
        const section = event.target.dataset.section;
        const targetPage = event.target.dataset.page;
        const currentPath = window.location.pathname;

        console.log('scrolltosection method');
        console.log(targetPage);
        console.log(currentPath);
        this.animateMega(false);
        this.activeMenu= null;

        if(currentPath === targetPage) {
            publish('scrolltosection', {section});
            console.log('called publish method');
        } else {
            console.log('setting pending and navigating...');
            setPendingScroll(section);
            this[NavigationMixin.Navigate]({
                type: 'standard__webPage',
                attributes: { url: targetPage }
            });
        }
    }

    handleJourneysClick() {
        if(isGuest) {
            this.currentPage = '/customerlogin';
            this[NavigationMixin.Navigate]({
                type: 'standard__webPage',
                attributes: {url: '/customerlogin'}
            })
        } else {
            this.currentPage = '/journeys';
             this[NavigationMixin.Navigate]({
                type: 'standard__webPage',
                attributes: { url: '/journeys' }
            });

            setTimeout(() => {
                window.dispatchEvent(new Event('navigatejourneys'));
            }, 0);
        }
    }

    handlePurchaseClick() {
        if(isGuest) {
            this.currentPage = '/customerlogin';
            this[NavigationMixin.Navigate]({
                type: 'standard__webPage',
                attributes: {url: '/customerlogin'}
            })
        } else {
            this.currentPage = '/purchases';
             this[NavigationMixin.Navigate]({
                type: 'standard__webPage',
                attributes: { url: '/purchases' }
            });

            setTimeout(() => {
                window.dispatchEvent(new Event('navigatepurchases'));
            }, 0);
        }
    }

    handleEoiClick() {
        this.currentPage = '/eoi';
        this[NavigationMixin.Navigate]({
            type: 'standard__webPage',
            attributes: { url: '/eoi'}
        });

        setTimeout(() => {
            window.dispatchEvent(new Event('navigatetoeoi'));
        }, 0);
    }

    async initilizeUserContext() {
        try {
            if (!isGuest) {
                this.userType = 'Authenticated';
                const result = await getContactId();
                const userFirstName = await getFirstName();
                this.contactId = result;
                this.firstName = userFirstName;
            } else {
                this.userType = 'Guest';
                this.contactId = null;
                this.firstName = 'there';
            }

            console.log('User Type: ', this.userType);
            console.log('Contact Id: ', this.contactId);
            console.log('User First Name: ', this.firstName);

            this.isUserContextReady = true;
            this.trySetPrechatFields(); // attempt after context is ready

        } catch (error) {
            console.error('error fetching user context', error);
        }
    }

    loadMessaging() {
        // Case 1: event fires after user context is ready
        window.addEventListener('onEmbeddedMessagingReady', () => {
            console.log('Messaging is READY');
            this.isMessagingReady = true;
            this.trySetPrechatFields();
        }, { once: true });

        // Case 2: messaging was already ready before this component loaded (SPA navigation)
        if (window.embeddedservice_bootstrap?.prechatAPI) {
            console.log('Messaging already ready on mount (SPA)');
            this.isMessagingReady = true;
        }
    }

    trySetPrechatFields() {
        // Only proceed when BOTH are ready
        if (!this.isMessagingReady || !this.isUserContextReady) {
            console.log('Waiting — messaging ready:', this.isMessagingReady, '| user context ready:', this.isUserContextReady);
            return;
        }

        try {
            const basePathValue = basePath || '';
            let currentPage = window.location.pathname.replace(basePathValue, '') || '/';
            if (currentPage === '') currentPage = '/';

            window.embeddedservice_bootstrap.prechatAPI.setHiddenPrechatFields({
                userType: this.userType,
                contactId: this.contactId,
                firstName: this.firstName,
                currentPage: currentPage
            });

            console.log('Prechat fields set:', {
                userType: this.userType,
                contactId: this.contactId,
                firstName: this.firstName,
                currentPage: currentPage
            });

        } catch (error) {
            console.error('Failed to set prechat fields:', error);
        }
    }

    handleLogout(event) {
        event.preventDefault();

        try {
            if (window.embeddedservice_bootstrap?.userVerificationAPI) {
                window.embeddedservice_bootstrap.userVerificationAPI.clearSession();
            }
        } catch(error) {
            console.error(error);
        }

        const iframe = document.querySelector('iframe');

        iframe.contentWindow.postMessage(
            {
                type: 'END_CONVERSATION',
                context: 'logout'
            },
            '*'
        );

        const sitePrefix = basePath.replace("/", "");
        setTimeout(() => {
            window.location.href = `/${sitePrefix}/secur/logout.jsp`; 
        }, 800); 
    }

    handleOpenUpload(event) {
        const { documentId, documentType, acceptedFormats } = event.detail;

        this.activeDocumentId = documentId;
        this.activeDocumentType = documentType;
        this.activeAcceptedFormats = acceptedFormats;
        this.showUploadModal = true;
    }

    handleUploadFinished(event) {
        const file = event.detail.files[0];

        window.dispatchEvent(new CustomEvent('chatuploadcomplete', {
            detail: {
                documentId: this.activeDocumentId,
                contentDocumentId: file.documentId
            }
        }));

        this.closeModal();
    }

    closeModal() {
        this.showUploadModal = false;
        this.activeDocumentId = null;
        this.activeDocumentType = '';
        this.activeAcceptedFormats = [];
    }

    handleBackdropClick() {
        this.closeModal();
    }

    stopPropagation(event) {
        event.stopPropagation();
    }

    handleMessage(event) {
        if(event.data.type === 'CHAT_CONVERSATION_ENDED') {
            console.log('Received CHAT_CONVERSATION_ENDED message from iframe');
            window.location.reload();
        }

        if(event.data.type === 'paymentPlanSelectionCardLoaded' || event.data.type === 'appointmentCreationLoaded') {
            
            const chatIframe = document.getElementById('embeddedMessagingFrame');

            chatIframe.contentWindow.postMessage(
                {
                    type: 'userContextReady',
                    userType: this.userType,
                    contactId: this.contactId,
                },
                '*'
            );
        }
    }
}