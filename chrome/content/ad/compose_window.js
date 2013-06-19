/*
 * The main purpose of this is to allow to work on other windows besides compose, like
 * conversations compose extension.
 * 
 * 
 * Interface of any compose_window implementation:
 *   
 *   // type: can be "TO", "CC" or "BCC"
 *   // returns an array with the recipients
 *   recipients( type )
 *   
 *   // It registers the listeners for:
 *   //
 *   //    start and stop, when windows loses focus, etc.
 *   //    
 *   //    for dictionary change
 *   //    
 *   //    for recipients changed
 *   //
 *   setListeners( ad_object )
 *   
 *   // Shows a message to the user by some seconds.
 *   setLabel( message )
 **/

/**
 *  params are:
 *    ad: automatic_dictionary instance
 *    name: plugin name
 *    logo_url: url of the plugin logo
 *    notification_time: time to show notifications in ms
 *    
 **/
AutomaticDictionary.ComposeWindow = (function( params ){
    this.ad = params.ad;
    this.params = params;
    this.shutdown_chain = [];
});

AutomaticDictionary.ComposeWindow.canManageWindow = function(window){
    //We can manage the messengercompose window.
    return window.document.location == "chrome://messenger/content/messengercompose/messengercompose.xul";
};

AutomaticDictionary.extend( 
    AutomaticDictionary.ComposeWindow.prototype,
    AutomaticDictionary.Lib.Shutdownable);
    
AutomaticDictionary.extend( AutomaticDictionary.ComposeWindow.prototype, {
    
    notificationbox_elem_id: "automatic_dictionary_notification",
    
    name: "ComposeWindow",
    
    setListeners:function(){
        var window = this.ad.window;
        if( window && !window.automatic_dictionary_initialized ){
            var _this = this;
            
            this.setListener( window, 'unload', function(){
                _this.log("window unload");
                _this.ad.stop();
                _this.ad.shutdown();
            });
           
            this.setListener( window, 'compose-window-reopen', function(){
                _this.log("compose window reopen");
                _this.ad.start();
            }, false);
            //Observe when the dict changes
            this.setListener( window.document.getElementById("languageMenuList"),"command",
                function(event){
                    _this.ad.languageChanged(event);
                },false);
               
            this.setListener( window, "blur", function(evt){
                if(evt.target == window){
                    _this.log("compose window blur");
                    _this.ad.stop();
                }            
            } , false);
            this.setListener( window, "focus", function(){
                _this.log("compose window focus");
                _this.ad.start();
                try{
                    _this.ad.deduceLanguage();
                }catch(e){
                    AutomaticDictionary.logException(e);
                }
            }, true );
            
            this.setListener(window,"command", function(evt){
                _this.log("Window - Commmand event triggered with "+evt.target);
                if( evt.target.parentNode.id == "spellCheckDictionariesMenu"){
                    _this.log("clicked on context dict menu");
                    window.setTimeout(function(){
                        _this.ad.languageChanged();
                    },500); //Hardcoded. Enough? Otherways the lang is still not changed
                }
            }, true);
            
            this.setListener(window, "compose-send-message", function(evt){
                _this.ad.notifyMailSent();
            }, false );
            
            this.prepareWindow(window);
            
            window.automatic_dictionary_initialized = true;
            this.shutdown_chain.push(function(){
                window.automatic_dictionary_initialized = false;
            });
            this.log("events seem to be registered");
        }else{
            this.log("no window found or already initialized");
        }
    },
        
    prepareWindow:function(window){
        var document = window.document;
        //Add window items
        var hbox=document.createElement("hbox");       
        var nb = document.createElement("notificationbox");
        nb.id = this.notificationbox_elem_id;
        nb.flex="1";
        hbox.appendChild(nb);
        var target = document.getElementById("status-bar");
        target.parentNode.insertBefore(hbox, target);
        
        this.shutdown_chain.push(function(){
            hbox.parentNode.removeChild(hbox);
        });
    },
    
    //Log function
    log:function( msg ){
        AutomaticDictionary.dump( this.name + ":: "+ msg );
    },
    
    recipients:function( recipientType ){
        recipientType = recipientType || "to";
        var fields = Components.classes["@mozilla.org/messengercompose/composefields;1"]
            .createInstance(Components.interfaces.nsIMsgCompFields);
        this.ad.window.Recipients2CompFields( fields );
        var nsIMsgRecipientArrayInstance = {
            length:0
        };
        var fields_content = fields[recipientType]; 
        if( fields_content ){
            nsIMsgRecipientArrayInstance = fields.splitRecipients( fields_content, true, {} );
        }
        var arr = [];
        if(nsIMsgRecipientArrayInstance.length > 0){
            for(var i=0; i< nsIMsgRecipientArrayInstance.length; i++){
                arr.push(nsIMsgRecipientArrayInstance[i].toString());
            }
        }
        this.log("recipients found: " + arr.toSource());
        return arr;
    },
    
    // TODO: maybe this has to go aside in another interface? with showLabel?
    showMessage: function( str, options ){
        options = options || {};
        var notification_value = "show-message";
        //FIXME: DRY this code with changeLabel
        var nb = this.ad.window.document.getElementById(this.notificationbox_elem_id);
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
        var window = this.ad.window;
        this.log("Writting to label: " + str);
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
    }
    
});

//Register compose window
AutomaticDictionary.window_managers.push(AutomaticDictionary.ComposeWindow);