/*
 * Compose window that works with conversations compose windows
 *  
 * Conversations are xhtml documents attached to the main window.
 * 
 * To detect when the window is waken up we monkypatch a method of Converstations.
 * 
 * 
 * Look at compose_window.js for more info about compose windows in AD.
 **/

/**
 *  params are:
 *    ad: automatic_dictionary instance
 *    name: plugin name
 *    logo_url: url of the plugin logo
 *    notification_time: time to show notifications in ms
 *    
 **/
var mozISpellCheckingEngine = Components.interfaces.mozISpellCheckingEngine;
var nsISupportsString = Components.interfaces.nsISupportsString;

AutomaticDictionary.ConversationsComposeWindow = (function( params ){
    this.ad = params.ad;
    this.params = params;
    this.logger = params.logger;
});

AutomaticDictionary.ConversationsComposeWindow.fetchWindowAndInit = function(window){
    var mm = window.document.getElementById("multimessage");
    if( mm.contentWindow ){
        AutomaticDictionary.initWindow( mm.contentWindow );
    }else{
        AutomaticDictionary.logger.warn("Not found content window in multimessage");
    }
}

AutomaticDictionary.ConversationsComposeWindow.canManageWindow = function(window){
    return "chrome://conversations/content/stub.xhtml" == window.document.location.toString();
};

//Inherits instance methods from ComposeWindow
AutomaticDictionary.extend(
    AutomaticDictionary.ConversationsComposeWindow.prototype,
    AutomaticDictionary.ComposeWindow.prototype
    );
//We extend with extra functionality
AutomaticDictionary.extend( AutomaticDictionary.ConversationsComposeWindow.prototype, 
{    
    name: "ConversationsComposeWindow",
    
    setListeners:function(){
        var window = this.ad.window;
        if( window && !window.automatic_dictionary_initialized ){
            var _this = this;
            this.setListener(window,"compose-window-close", function(){
                _this.ad.stop();
            }, true);
            this.setListener(window,'compose-window-reopen', function(){
                _this.ad.start();
            }, true);
            this.setListener(window,"blur", function(evt){
                if( evt.target.tagName == "textarea"){
                    _this.logger.debug("blur on textarea detected");
                    _this.last_textarea_detected = evt.target;
                    _this.ad.stop();
                }
            } , true);
            this.setListener(window,"focus", function(evt){
                if( evt.target.tagName == "textarea" && !evt.automatic_dictionary_managed){
                    _this.ad.start();
                    _this.logger.debug("focus on textarea detected");
                    _this.last_textarea_detected = evt.target;
                    evt.automatic_dictionary_managed = true;
                    window.setTimeout(function(){
                        try{
                            _this.ad.deduceLanguage();
                        }catch(e){
                            AutomaticDictionary.logExceptiom(e);
                        }
                    }, 300); //Time for input to wait inputs updates.
                }
            }, true );

            // Listening on change on inputs is not working. To fix that, I've
            // added a deduce language some milis after focus on textarea to let
            // the inputs be updated.
            var inputs = ["to","cc","bcc"];
            for(var x = 0; x<inputs.length; x++){
                this.setListener( window.document.getElementById(inputs[x]),
                    "change",
                    function(){
                        _this.logger.debug("CHANGE ON INPUT");
                        try{
                            _this.ad.deduceLanguage();
                        }catch(e){
                            AutomaticDictionary.logExceptiom(e);
                        }
                    }
                );
            }

            this.listenToSpellCheckingCommands(window);
            
            this.prepareWindow(AutomaticDictionary.main_window);
            
            this.logger.debug("events seem to be registered");

            window.automatic_dictionary_initialized = true;
            this.shutdown_chain.push(function(){
               window.automatic_dictionary_initialized = false;
            });
        }
    },
    
    recipients:function( recipientType ){
        recipientType = recipientType || "to";
        var recipients;
        with(this.ad.window){
            recipients = JSON.parse($("#"+recipientType).val());
        }
        //Clean recipients
        for(var x=0;x<  recipients.length;x++){
            recipients[x] = this.cleanEmail(recipients[x]);
        }
        this.logger.debug("recipients found: " + recipients.toSource());
        return recipients;
    },
    
    mail_format: /.*<(.*)>/,
    
    // Recieving "foo <bar>" returns "bar"
    cleanEmail:function(str){
        var match = this.mail_format.exec(str);
        return (match && match[1]) || str;
    },
    
    // TODO: maybe this has to go aside in another interface? with showLabel?
    showMessage: function( str, options ){
        options = options || {};
        var window = AutomaticDictionary.main_window;
        var notification_value = "show-message";
        //FIXME: DRY this code with changeLabel
        var nb = window.document.getElementById(this.notificationbox_elem_id);
        var n = nb.getNotificationWithValue(notification_value);
        if(n) {
            n.label = str;
        } else {
            var buttons = options.buttons || [];
            var priority = nb.PRIORITY_INFO_HIGH;
            n = nb.appendNotification(str, notification_value, this.params.logo_url, priority, buttons);
        }
    },
    
    changeLabel: function( str ){
        var window = AutomaticDictionary.main_window;
        this.logger.debug("Writting to label: " + str);
        if( str=="" ){
            return;
        }
        if(this.label_timeout){
            window.clearTimeout(this.label_timeout);
        }
        var nb = window.document.getElementById(this.notificationbox_elem_id);
        var n = nb.getNotificationWithValue('change-label');
        str = this.params.name + ": " + str;  
        if(n) {
            n.label = str;
        } else {
            var buttons = [];
            var priority = nb.PRIORITY_INFO_MEDIUM;
            n = nb.appendNotification(str, 'change-label', this.params.logo_url, priority, buttons);
        }
        this.label_timeout = window.setTimeout( function( ){
            nb.removeNotification( n );
        }, this.params.notification_time);
    },
    
    //Copy&edit from ./mail/components/compose/content/MsgComposeCommands.js
    changeLanguage: function (event){
        var editor = this.ad.window.getActiveEditor();
        editor = editor.QueryInterface(Components.interfaces.nsIDOMNSEditableElement).editor;
        InlineSpellCheckerUI.init(editor);
        var _this = this;
        // callback to select a dictionary
        InlineSpellCheckerUI.selectDictionaryByName = function(name){
            if (! this.mInlineSpellChecker || name == "" ){
                _this.logger.debug("No mInlineSpellChecker or empty")
                return;
            }
            
            var spellchecker = this.mInlineSpellChecker.spellChecker;
            spellchecker.SetCurrentDictionary(name);
            this.mInlineSpellChecker.spellCheckRange(null); // causes recheck
        };
        
        try{
            InlineSpellCheckerUI.selectDictionaryByName( event.target.value );
        }catch(e){
            AutomaticDictionary.logException(e);
        }
    }    
});

//Register compose window
AutomaticDictionary.window_managers.push(AutomaticDictionary.ConversationsComposeWindow);