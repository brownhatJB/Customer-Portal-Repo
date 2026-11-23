import { LightningElement, api, wire, track } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { updateRecord } from 'lightning/uiRecordApi';
import EXPIRY_DATE_FIELD from '@salesforce/schema/Document__c.Expiry_Date__c';
import ID_FIELD from '@salesforce/schema/Document__c.Id';
import getDocuments from '@salesforce/apex/DocumentRecordCollection.documents';
import uploadDocument from '@salesforce/apex/CpDocumentsController.uploadDocument';
import getDocumentUrl from '@salesforce/apex/CpDocumentsController.getDocumentUrl';
import { refreshApex } from '@salesforce/apex';

const DATE_OPTS = { year: 'numeric', month: 'short', day: '2-digit' };
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

export default class DocumentChecklist extends LightningElement {
    @api recordId;
    @track _documents = [];
    @track _editMap = {};
    @track _editingId = null;
    @track _uploadingIds = new Set();
    isLoading = true;
    error = false;

    @wire(getDocuments, { recordId: '$recordId' })
    wiredDocs({ data, error }) {
        this.isLoading = false;
        if (data) {
            this._documents = data.map(d => ({ ...d }));
            // console.log('Fetched documents: ', JSON.stringify(this._documents, null, 2));
        }
        if (error) {
            this.error = true;
            // console.error('error fetching docs:', error);
        }
    }

    get documents() {
        return this._documents.map(doc => {
            const expiry = doc.Expiry_Date__c ? new Date(doc.Expiry_Date__c) : null;
            const today = new Date();
            const isExpired = expiry && expiry < today;
            const isSoonExpiring = expiry && !isExpired &&
                (expiry - today) / (1000 * 60 * 60 * 24) <= 30;

            return {
                ...doc,
                isEditingExpiry: this._editingId === doc.Id,
                isUploading: this._uploadingIds.has(doc.Id),
                formattedExpiry: expiry
                    ? expiry.toLocaleDateString('en-GB', DATE_OPTS)
                    : '—',
                expiryClass: isExpired
                    ? 'expiry-text expired'
                    : isSoonExpiring
                        ? 'expiry-text expiring-soon'
                        : 'expiry-text',
                statusClass: `status-badge status-${(doc.Status__c || '').toLowerCase().replace(/\s+/g, '-')}`,
                uploadLabel: doc.Document_Uploaded__c ? 'Replace' : 'Upload',
                canPreview: !!doc.Document_Uploaded__c && !!doc.ContentDocumentId__c,
            };
        });
    }

    get hasDocuments() { return !this.isLoading && !this.error && this._documents.length > 0; }
    get isEmpty()      { return !this.isLoading && !this.error && this._documents.length === 0; }

    // ── Expiry Edit ───────────────────────────────────────────────────────────
    handleEditExpiry(event) {
        this._editingId = event.currentTarget.dataset.id;
    }

    handleDateChange(event) {
        const id = event.currentTarget.dataset.id;
        this._editMap[id] = event.target.value;
    }

    handleCancelExpiry() {
        this._editingId = null;
    }

    async handleSaveExpiry(event) {
        const id = event.currentTarget.dataset.id;
        const newDate = this._editMap[id];
        if (!newDate) { this._editingId = null; return; }

        try {
            await updateRecord({
                fields: {
                    [ID_FIELD.fieldApiName]: id,
                    [EXPIRY_DATE_FIELD.fieldApiName]: newDate
                }
            });
            this._documents = this._documents.map(d =>
                d.Id === id ? { ...d, Expiry_Date__c: newDate } : d
            );
            this._editingId = null;
            this._toast('Saved', 'Expiry date updated.', 'success');
        } catch (e) {
            this._toast('Error', e.body?.message || 'Could not update expiry date.', 'error');
        }
    }

    // ── File Upload ───────────────────────────────────────────────────────────
    async handleFileUpload(event) {
        const docId = event.currentTarget.dataset.id;
        const file = event.target.files[0];
        if (!file) return;

        if (file.size > MAX_FILE_SIZE) {
            this._toast('File too large', 'Maximum file size is 5 MB.', 'error');
            return;
        }

        // Mark uploading
        this._uploadingIds = new Set([...this._uploadingIds, docId]);
        this._documents = [...this._documents]; // trigger reactivity

        try {
            const base64 = await this._readFileAsBase64(file);
            const doc = this._documents.find(d => d.Id === docId);

            const downloadUrl = await uploadDocument({
                documentId: docId,
                fileName: file.name,
                base64Data: base64,
                contentType: file.type,
                existingContentDocumentId: doc?.ContentDocumentId__c || null
            });

            // Update local record
            this._documents = this._documents.map(d => {
                if (d.Id !== docId) return d;
                return {
                    ...d,
                    Document_Uploaded__c: true,
                    _previewUrl: downloadUrl,
                    Status__c: 'Document Uploaded'
                };
            });

            this._toast('Uploaded', `${file.name} uploaded successfully.`, 'success');
        } catch (e) {
            this._toast('Upload failed', e.body?.message || 'Could not upload file.', 'error');
        } finally {
            const next = new Set(this._uploadingIds);
            next.delete(docId);
            this._uploadingIds = next;
            this._documents = [...this._documents];
        }
    }

    // ── Preview ───────────────────────────────────────────────────────────────
    async handlePreview(event) {
        const docId = event.currentTarget.dataset.id;
        const doc = this._documents.find(d => d.Id === docId);
        
        console.log('doc Id: ', docId);
        console.log('doc: ', JSON.stringify(doc));
        // Use cached URL if available
        if (doc?._previewUrl) {
            window.open(doc._previewUrl, '_blank', 'noopener,noreferrer');
            return;
        }

        if (!doc?.contentDocumentId__c) return;

        try {
            const url = await getDocumentUrl({ contentDocumentId: doc.contentDocumentId__c });
            if (url) {
                // Cache it
                this._documents = this._documents.map(d =>
                    d.Id === docId ? { ...d, _previewUrl: url } : d
                );
                window.open(url, '_blank', 'noopener,noreferrer');
            } else {
                this._toast('Not available', 'No preview URL found for this document.', 'warning');
            }
        } catch (e) {
            this._toast('Error', e.body?.message || 'Could not fetch preview URL.', 'error');
        }
    }

    // ── Helpers ───────────────────────────────────────────────────────────────
    _readFileAsBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result.split(',')[1]);
            reader.onerror = () => reject(new Error('File read failed'));
            reader.readAsDataURL(file);
        });
    }

    _toast(title, message, variant) {
        this.dispatchEvent(new ShowToastEvent({ title, message, variant }));
    }

    get hasAllDocumentsUploaded() {
        return this._documents.every(doc => doc.Document_Uploaded__c);
    }

}