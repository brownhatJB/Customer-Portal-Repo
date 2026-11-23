import { LightningElement, api ,track} from "lwc";
import { dispatchMessagingEvent, assignMessagingEventHandler, MESSAGING_EVENT } from "lightningsnapin/eventStore";

const SLDS_MENU_SELECTOR = "slds-dropdown-trigger slds-dropdown-trigger_click";

export default class cpChatHeader extends LightningElement {
  /**
  * Deployment configuration data.
  * @type {Object}
  */
  @api configuration = {};

  /**
  * The status of the conversation. Valid values:
  * - NOT_STARTED
  * - OPEN
  * - CLOSED
  * @type {ConversationStatus}
  */
  @api conversationStatus;

  @track chatbotOptionsMenu = [
    { optionIdentifier: 'CREATE_ENQUIRY', label: 'Create Enquiry', guest: true },
    { optionIdentifier: 'SCHEDULE_APPOINTMENT', label: 'Schedule Appointment', guest: false },
    { optionIdentifier: 'SHOW_UNITS', label: 'Show Units', guest: false },
    { optionIdentifier: 'CONNECT_EMPLOYEE', label: 'Connect Employee', guest: false }
];

  /**
  * Class name for header menu.
  * @type {String}
  */
  menuClass = SLDS_MENU_SELECTOR;

  /**
  * Array to store bot options menu.
  * @type {Array}
  */
  chatbotOptionsMenu = [];

  /**
  * Whether the use is authenticated.
  * AuthMode can have the following values:
  * - Auth: user is in verified, which corresponds to the authenticated user mode.
  * - UnAuth: user is in unverified,  which corresponds to the guest user mode.
  */
  get isAuthenticatedContext() {
      return this.configuration.embeddedServiceMessagingChannel.authMode === "Auth";
  }

  /**
  * Whether to show the back button.
  * @type {Boolean}
  */
  showBackButton = false;

  /**
  * Whether to show the header menu button.
  * @returns {Boolean}
  */
  get showMenuButton() {
      return this.conversationStatus === "OPEN";
  }

  /**
  * Whether to show the header menu.
  * @type {Boolean}
  */
  _showMenu = false;
  get showMenu() {
      return this._showMenu;
  }
  set showMenu(shouldShow) {
      this.menuClass = SLDS_MENU_SELECTOR + (shouldShow ? " slds-is-open" : "");
      this._showMenu = shouldShow;
  }

  /**
  * Whether to show the close button.
  * @returns {Boolean}
  */
  get showCloseButton() {
      return this.conversationStatus !== "OPEN" || this.conversationStatus === "OPEN";
  }

  /**
  * Handle back button click.
  */
  onBackButtonClick() {
      dispatchMessagingEvent(MESSAGING_EVENT.BACK_BUTTON_CLICK, {});
  }

  /**
  * Handle menu button click.
  */
  onMenuButtonClick() {
      this.showMenu = !this.showMenu;
  }

  /**
  * Handle minimize button click.
  */
  onMinimizeButtonClick() {
      dispatchMessagingEvent(MESSAGING_EVENT.MINIMIZE_BUTTON_CLICK, {});
  }

  /**
  * Handle close button click.
  */
  onCloseButtonClick() {
      dispatchMessagingEvent(MESSAGING_EVENT.CLOSE_CONTAINER, {});
  }

  /**
  * Handle end conversation button click.
  */

  get visibleOptions() {
    const isGuest = !sessionStorage.getItem('contactId');
    return this.chatbotOptionsMenu.filter(option => isGuest ? option.guest : true);
  }

  onMenuOptionClick(event) {

    event.preventDefault();
    const btn = event.target.closest('.chatbotMenuOption');
    const id = btn?.dataset.id;
    if (!id) return;

    if (id === 'CREATE_ENQUIRY') {
    this.showMenu = false;
    window.parent.embeddedservice_bootstrap?.utilAPI?.sendTextMessage?.('Create an enquiry');
    return;
    }

    if (id === 'SCHEDULE_APPOINTMENT') {
    this.showMenu = false;
    window.parent.embeddedservice_bootstrap?.utilAPI?.sendTextMessage?.('Schedule an appointment');
    return;
    }

    if (id === 'SHOW_UNITS') {
    this.showMenu = false;
    window.parent.embeddedservice_bootstrap?.utilAPI?.sendTextMessage?.('Show available units');
    return;
    }

    if (id === 'CONNECT_EMPLOYEE') {
    this.showMenu = false;
    window.parent.embeddedservice_bootstrap?.utilAPI?.sendTextMessage?.('Connect to a customer care employee');
    return;
    }

    const opt = this.chatbotOptionsMenu.find(o => o.optionIdentifier === id);
    if (opt) {
    dispatchMessagingEvent(MESSAGING_EVENT.MENU_ITEM_SELECTED, { selectedOption: opt });
    }
    this.showMenu = false;
    }
  

/**
* Handle end chat button click.
*
* Ending a messaging session is only supported for verified users.
* Ending a conversation is only supported for unverified users.
*/
onEndChatClick() {

    sessionStorage.removeItem('welcomeMessageSent');

    if (this.isAuthenticatedContext) {
        this.configuration.util.endSession();
    } else {
        dispatchMessagingEvent(MESSAGING_EVENT.CLOSE_CONVERSATION, {});
        window.parent.postMessage(
            {
                type: 'CHAT_CONVERSATION_ENDED',
            },
            '*'
        );
    }

    this.showMenu = false;
}


  connectedCallback() {
      this.messageHandler = this.handleMessage.bind(this);

      window.addEventListener('message', this.messageHandler);

      assignMessagingEventHandler(MESSAGING_EVENT.PARTICIPANT_JOINED, (data) => {
          console.log(`Participant joined`);

        // const alreadySent = sessionStorage.getItem('welcomeMessageSent');

        // if (!alreadySent) {

        //     setTimeout(() => {
        //         window.parent.embeddedservice_bootstrap?.utilAPI?.sendTextMessage?.(
        //             'Hello Agent'
        //         );
        //         sessionStorage.setItem('welcomeMessageSent', 'true');
        //     }, 5000);
        // }

          if (data.options && Array.isArray(data.options)) {
              data.options.forEach((participantOption) => {
                  this.chatbotOptionsMenu.push(participantOption);
              });
          }
      });

      assignMessagingEventHandler(MESSAGING_EVENT.PARTICIPANT_LEFT, (data) => {
          console.log(`Participant left`);

        //   sessionStorage.removeItem('welcomeMessageSent');

          this.chatbotOptionsMenu = [];
      });

      assignMessagingEventHandler(MESSAGING_EVENT.UPDATE_HEADER_TEXT, (data) => {
          console.log(`Update header text: ${data.text}`);
      });

      assignMessagingEventHandler(MESSAGING_EVENT.TOGGLE_BACK_BUTTON, (data) => {
          console.log(`Toggle back button visibility.`);

          this.showBackButton = data.showBackButton;
      });

  }

    disconnectedCallback() {
        window.removeEventListener('message', this.messageHandler);
    }

    handleMessage(event) {

        console.log(event.data);

        if (event.data.type === 'END_CONVERSATION') {
            // sessionStorage.removeItem('welcomeMessageSent');
            dispatchMessagingEvent(MESSAGING_EVENT.CLOSE_CONVERSATION, {});
            this.showMenu = false;

            window.parent.postMessage(
                {
                    type: 'CHAT_CONVERSATION_ENDED',
                },
                '*'
            );
        }
    }
}