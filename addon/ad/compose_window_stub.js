/*
 * 
 * ComposeWindowStub not attached to any window
 * 
 **/
export function apply(AutomaticDictionary){
AutomaticDictionary.ComposeWindowStub = (function( params ){
    this.ad = params.ad;
    this.params = params;
    this.shutdown_chain = [];
});

AutomaticDictionary.ComposeWindowStub.canManageWindow = function(window){
    //We can manage the messengercompose window.
    return false;
};

AutomaticDictionary.extend( 
    AutomaticDictionary.ComposeWindowStub.prototype,
    AutomaticDictionary.Lib.Shutdownable);
    
AutomaticDictionary.extend( AutomaticDictionary.ComposeWindowStub.prototype, {
    
    notificationbox_elem_id: "automatic_dictionary_notification",
    
    name: "ComposeWindowStub",
    
    setListeners:function(){
        // Nothing to be done
    },

    //Log function
    log:function( msg ){
        this.ad.logger.debug( this.name + ":: "+ msg );
    },

    recipients:function( recipientType ){
        return [];
    },
    
    // TODO: maybe this has to go aside in another interface? with showLabel?
    showMessage: function( str, options ){},
    
    changeLabel: function( str ){}
    
});

    //Register compose window?  Not needed. This compose window doesn't have to detect windows.

}