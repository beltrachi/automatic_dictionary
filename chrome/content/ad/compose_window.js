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

AutomaticDictionary.ComposeWindow.prototype = {
    
    notificationbox_elem_id: "automatic_dictionary_notification",
    
    shutdown_chain: [],
    
    setListeners:function(){
        var window = this.ad.window;
        if( window ){
            var _this = this;
            this.setListener(window,"compose-window-close", function(){
                _this.ad.stop();
            }, true);
            this.setListener( window, 'compose-window-reopen', function(){
                _this.ad.start();
            }, true);
            //Observe when the dict changes
            this.setListener( window.document.getElementById("languageMenuList"),"command",
                function(event){
                    _this.ad.languageChanged(event);
                },false);
               
            this.setListener( window, "blur", function(){
                _this.ad.stop();
            } , true);
            this.setListener( window, "focus", function(){
                _this.ad.start();
                try{
                _this.ad.deduceLanguage();
                }catch(e){
                    this.log(e.toString());
                }
            }, true );
            
            this.prepareWindow(window);
            
            this.log("events seem to be registered");
        }else{
            this.ad.changeLabel(this.ad.t("settingListenersError"));
            this.log("no window found");
        }
    },
    
    //Registers and queues unregistering
    setListener: function(target, on, func, useCapture){
        target.addEventListener(on, func, useCapture);
        this.shutdown_chain.push(function(){
           target.removeEventListener(on, func, useCapture); 
        });
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
        AutomaticDictionary.dump( "ComposeWindow:: "+ msg );
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
    },
    
    shutdown:function(){
        this.log("Shutdown...");
        for(var x=0; x< this.shutdown_chain.length;x++){
            try{
                this.log("Shutdown chain "+ x + "/"+this.shutdown_chain.length);
                this.shutdown_chain[x]();
            }catch(e){
                AutomaticDictionary.logException(e);
            }
        }
    }
    
};

//Register compose window
AutomaticDictionary.window_managers.push(AutomaticDictionary.ComposeWindow);