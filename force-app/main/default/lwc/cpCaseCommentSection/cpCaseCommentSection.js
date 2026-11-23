import { LightningElement, api, wire } from 'lwc';
import getComments from '@salesforce/apex/CasePortalController.getComments';
import addComment from '@salesforce/apex/CasePortalController.addComment';
import searchUsers from '@salesforce/apex/CasePortalController.searchUsers';
import { refreshApex } from '@salesforce/apex';

export default class CpCaseCommentSection extends LightningElement {

    @api recordId;

    comments = [];
    newComment = '';
    replyToId = null;
    wiredData;
    //new
     users = [];
    showSuggestions = false;
    searchKey = '';
    replyComment = '';
    isReplyMode = false;

    connectedCallback() {
    console.log('RecordId:', this.recordId);
}

    // Fetch
    @wire(getComments, { caseId: '$recordId' })
    wired(result) {
        this.wiredData = result;
        if (result.data) {
            this.comments = this.buildTree(result.data);
        }
    }


buildTree(data) {
    const map = {};
    const roots = [];

    data.forEach(c => {
        map[c.Id] = {
            ...c,
            initials: this.getInitial(c.CreatedBy?.Name || ''),
            createdAt: this.formatRelativeTime(c.CreatedDate),
            replies: []
        };
    });

    data.forEach(c => {
        const node = map[c.Id];

        if (c.Parent_Comment__c && map[c.Parent_Comment__c]) {
            map[c.Parent_Comment__c].replies.push(node);
        } else {
            roots.push(node);
        }
    });

    return roots;
}

formatRelativeTime(dateTime) {
    if (!dateTime) return '';

    const now = new Date();
    const created = new Date(dateTime);

    const diffMs = now - created;
    const diffMin = Math.floor(diffMs / 60000);
    const diffHr = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHr / 24);

    // relative for < 1 day
    if (diffDays < 1) {
        if (diffMin < 1) return 'just now';
        if (diffMin < 60) return `${diffMin} min ago`;
        return `${diffHr} hr ago`;
    }

    // full datetime for >= 1 day
    return created.toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}


// helper
getInitial(name) {
    return name ? name.charAt(0).toUpperCase() : '';
}



// Reply
handleReply(e) {
        this.replyToId = e.target.dataset.id;
        this.showSuggestions= false;
        this.isReplyMode = true;
        this.replyComment = '';
        const markReply = (list) => {
        return list.map(item => {
            return {
                ...item,
                showReply: item.Id === this.replyToId,
                replies: item.replies ? markReply(item.replies) : []
            };
        });
    };

    this.comments = markReply(this.comments);
    }



    // Post
    async handlePost() {

    try{
        const text = this.replyToId ? this.replyComment : this.newComment;

    if (!text || !text.trim()) return;

    await addComment({
        caseId: this.recordId,
        text: text,
        parentId: this.replyToId
    });

    this.newComment = '';
    this.replyComment = '';
    this.replyToId = null;
    this.showSuggestions = false;
    this.isReplyMode = false;

    await refreshApex(this.wiredData);
    this.template.querySelector('.commentBox').value = '';
    } catch (error) {
        console.error('Apex Error:', error);
    }
}

handleMainChange(e) {
      this.isReplyMode = false;

    this.newComment = e.target.value;

    const textToCheck = this.newComment;

    const match = textToCheck.match(/@(\w*)$/);

    if (match) {

        this.searchKey = match[1];
        this.fetchUsers();
        this.showSuggestions = true;

    } else {

        this.showSuggestions = false;
    }
}


// REPLY INPUT
handleReplyChange(e) {
      this.isReplyMode = true;

    this.replyComment = e.target.value;

    const textToCheck = this.replyComment;

    const match = textToCheck.match(/@(\w*)$/);

    if (match) {

        this.searchKey = match[1];
        this.fetchUsers();
        this.showSuggestions = true;

    } else {

        this.showSuggestions = false;
    }
}

 fetchUsers() {
        searchUsers({ searchKey: this.searchKey })
            .then(result => {
                this.users = result;
            });
    }

    // SELECT USER
handleUserSelect(event) {
    const name = event.currentTarget.dataset.name;
    const replacement = '@' + name + ' ';

    if (this.isReplyMode) {
        this.replyComment = this.replyComment.replace(/@(\w*)$/, replacement);
     
        const replyEl = this.template.querySelector('.inline textarea');
        if (replyEl) replyEl.value = this.replyComment;
    } else {
        this.newComment = this.newComment.replace(/@(\w*)$/, replacement);
      
        const mainEl = this.template.querySelector('.commentBox');
        if (mainEl) mainEl.value = this.newComment;
    }

    this.showSuggestions = false;
}

handleFocus() {
    this.showSuggestions = false;
    this.searchKey = '';
    this.users = [];
}

renderedCallback() {

    this.template.querySelectorAll('.text').forEach(el => {

        const text = el.dataset.value;

        if (text) {
            el.innerHTML = text.replace(
                 /@([a-zA-Z0-9]+(?:\s[a-zA-Z0-9]+)*)/g,
                '<span class="mention">@$1</span>'
            );
        }
    });
}

}