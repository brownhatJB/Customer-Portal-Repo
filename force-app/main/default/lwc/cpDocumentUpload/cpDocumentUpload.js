import { LightningElement, api } from 'lwc';
import uploadDocument from '@salesforce/apex/CpDocumentsController.uploadDocument';

export default class CpDocumentUpload extends LightningElement {

    @api documentId;

    isUploading = false;

    handleFileChange(event) {
        console.log('Document Id from child:',this.documentId);

        const file = event.target.files[0];

        if (!file) {return;}

        const reader = new FileReader();

        reader.onload = () => {

            const base64Data =
                reader.result.split(',')[1];

            this.isUploading = true;

            uploadDocument({
                documentId: this.documentId,
                fileName: file.name,
                base64Data: base64Data,
                contentType: file.type,
                existingContentDocumentId: null
            })
            .then((url) => {

                console.log('Uploaded URL:', url);

                this.dispatchEvent(
                    new CustomEvent('uploaded', {
                        detail: {
                            imageUrl: url
                        }
                    })
                );
            })
            .catch(error => {
                console.error(error);
            })
            .finally(() => {
                this.isUploading = false;
            });
        };

        reader.readAsDataURL(file);
    }
}