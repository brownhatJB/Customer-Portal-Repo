import { LightningElement, wire, track, api } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';
import { refreshApex } from '@salesforce/apex';
import getNotifications from '@salesforce/apex/BrokerNotificationController.getNotifications';
import markAllNotificationsAsRead from '@salesforce/apex/BrokerNotificationController.markAllNotificationsAsRead';
import markNotificationAsRead from '@salesforce/apex/BrokerNotificationController.markNotificationAsRead';
import basePath from '@salesforce/community/basePath';


export default class BrokerNotificationBell extends NavigationMixin(LightningElement) {
    @track isDropdownOpen = false;
    @track notifications = [];

    @api notificationFor;

    wiredResult;

    @wire(getNotifications, {
        notificationFor: '$notificationFor'
    })
    wiredNotes(result) {
        this.wiredResult = result;
        if (result.data) {
            this.notifications = result.data.map(note => ({
                ...note,
                itemClass: note.Is_Read__c ? 'note-item' : 'note-item unread',
                formattedDate: new Date(note.CreatedDate).toLocaleDateString()
            }));
        }  else if (result.error) {

        console.error('Notification Apex Error:', result.error);

        this.notifications = [];
        }
    }

    get unreadCount() {
        return this.notifications.filter(n => !n.Is_Read__c).length;
    }

    get hasNotifications() {
    return this.notifications && this.notifications.length > 0;

    }

    toggleDropdown(event) {
        event.stopPropagation();
        this.isDropdownOpen = !this.isDropdownOpen;
    }

    handlePanelClick(event) {
        event.stopPropagation();
    }

    async handleMarkAllAsRead(event) {
        event.stopPropagation(); 
        try {
            await markAllNotificationsAsRead({
                notificationFor: this.notificationFor
            });
            await refreshApex(this.wiredResult);
        } catch (error) {
            console.error('Error marking as read:', error);
        }
    }

    async handleNotificationClick(event) {
        event.stopPropagation(); 

        const recordId = event.currentTarget.dataset.id;

        const portal = event.currentTarget.dataset.portal;
        const type = event.currentTarget.dataset.type;
        const noteId = event.currentTarget.dataset.noteid;
        

        // Mark as read in the database and refresh the UI count
        if (noteId) {
            try {
                await markNotificationAsRead({ notificationId: noteId });
                await refreshApex(this.wiredResult);
            } catch (error) {
                console.error('Error marking as read:', error);
            }
        }

        let relativePath = '';

        if (portal === 'Broker Portal') {
            switch (type) {
                case 'Lead':
                    relativePath = `/eoi?c__recordId=${recordId}`;
                    break;
                case 'Payout':
                    relativePath = `/unit-sale/payout?c__unitSaleId=${recordId}`;
                    break;
                case 'Case':
                    relativePath = `/case-comments?recordId=${recordId}`;
                    break;
                case 'Broker Agent':
                    relativePath = `/profile`; // No recordId required
                    break;
                default:
                    relativePath = '/';
            }
        } else if (portal === 'Customer Portal') {
            // Define Customer Portal specific routing here if paths differ from Broker
            switch (type) {
                case 'Case':
                    relativePath = `/case-comments?recordId=${recordId}`;
                    break;
                // Add other customer routes as needed...
                default:
                    relativePath = '/';
            }
        }

        // Navigate (basePath automatically resolves /brokerportal or /customerportal)
        this[NavigationMixin.Navigate]({
            type: 'standard__webPage',
            attributes: {
                url: `${basePath}${relativePath}`
            }
        });
        
        this.isDropdownOpen = false;
    }

    closeDropdown() {
    this.isDropdownOpen = false;
    }
}