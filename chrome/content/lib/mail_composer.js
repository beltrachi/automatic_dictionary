if( !AutomaticDictionary.Lib ) throw "AutomaticDictionary.Lib required";

var mail_composer = function(){}

mail_composer.prototype = {
    // Public method
    openComposeMailWindow: function(to, cc, subject, body, attachments){
        if(!attachments) attachments = [];
        params = this.createComponents();
        this.configureParams(params, to, cc, subject, body);
        this.addAttachments(params, attachments);

        var msgComposeService = Components.classes["@mozilla.org/messengercompose;1"].getService(Components.interfaces.nsIMsgComposeService);
        msgComposeService.OpenComposeWindowWithParams(null, params);
    },
    //Creates params and params.composeFields
    // @return nsIMsgComposeParams
    createComponents: function(){
        var composeFields, params = Components.classes["@mozilla.org/messengercompose/composeparams;1"].createInstance(Components.interfaces.nsIMsgComposeParams);
        params.type = Components.interfaces.nsIMsgCompType.New;
        params.format = Components.interfaces.nsIMsgCompFormat.Default;
        params.identity = null;
        composeFields = Components.classes["@mozilla.org/messengercompose/composefields;1"].createInstance(Components.interfaces.nsIMsgCompFields);
        params.composeFields = composeFields;

        return params;
    },
    configureParams: function(params, to, cc, subject, body){
        params.composeFields.characterSet = 'UTF-8';
        params.composeFields.to = to;
        params.composeFields.cc = cc;
        params.composeFields.subject = subject;
        if (body){
            params.composeFields.body = body;
        }
    },
    addAttachments: function(params, attachments){
        var file, attachmentData;
        for(var i = 0 ; i < attachments.length; i++){
            file = attachments[i];
            attachmentData = Components.classes["@mozilla.org/messengercompose/attachment;1"].createInstance(Components.interfaces.nsIMsgAttachment);
            attachmentData.url = "file://" + file;
            attachmentData.name = file;
            params.composeFields.addAttachment(attachmentData);
        }
    }
}

AutomaticDictionary.Lib.MailComposer = new mail_composer();


