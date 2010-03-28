/**
    Implementation comments:
    
     * To support various compose windows we share the data hash between instances
       of ad, through the preferences service with SharedHash

Listener to:
 Event "Onchange of the dictionary button":
    -> save the language for the current recipients
 Event "Changed recipients list":
    -> deduce language for this recipients
    I DID'N FIND ANY WAY TO GET THE EVENT. It will be kept as observer.

*/
var AutomaticDictionary = {};
/**
 *   SharedHash is used to share preferences between compose windows in case you
 *   have more than one window open.
 *   Features:
 *       * When a set is done, it will be available to all SharedHashes through preferences-service
 *       * To spread the changes we save a version number in another preference field
 */
AutomaticDictionary.dump = function(msg){
    dump("AutomaticDictionary: ");
    dump(msg);
    dump("\n");
}
AutomaticDictionary.SharedHash = function( prefPath ){
    this.prefPath = prefPath;
    this.lockPath = prefPath + ".lock";
    this.prefManager = Components.classes["@mozilla.org/preferences-service;1"]
        .getService(Components.interfaces.nsIPrefBranch);
    //Taking into account that we will not init two SharedHashes at the same time
    this.id = (new Date()).getTime().toString() + Math.floor(Math.random()*1000000);

    return this;
}
AutomaticDictionary.SharedHash.prototype = {
    id: null,
    internal_version: 1,
    prefPath: null,
    prefManager: null,
    lockPath: null,
    data: null,
    version: null,

    load: function(){
        this.data = this.readData();
        this.version = this.readVersion();
    },
    readVersion: function(){
        return this.prefManager.getCharPref( this.prefPath + ".version" );
    },
    writeVersion: function( v ){
        return this.prefManager.setCharPref( this.prefPath + ".version", v);
    },
    readData:function(){
        var v = this.prefManager.getCharPref( this.prefPath );
        if( v ){
            try{
                return JSON.parse( v );
            }catch(e){
                return {};
            }
        }else
            return {};
    },
    writeData:function(){
        return this.prefManager.setCharPref(
            this.prefPath, JSON.stringify( this.data ) );
    },
    
    sincronized:function( func, force ){
        if( force ) this.log("WARN AutomaticDictionary.SharedHash#sincronized with force");
        try{
            this.log("lock is " + JSON.stringify(
                this.prefManager.getCharPref( this.lockPath )));
            var nestedSync = this.gotLock();
            if( force || nestedSync ||
                    this.prefManager.getCharPref( this.lockPath ).length == 0  ){
                this.prefManager.setCharPref( this.lockPath, this.id );
                this.log("2 - lock is " +
                    JSON.stringify(this.prefManager.getCharPref( this.lockPath )));
                if( force || this.gotLock() ){
                    this.log("executing on sync");
                    func();
                    if( !nestedSync ){
                        this.prefManager.setCharPref( this.lockPath, "" ); //Release lock
                        this.log("lock released is " +
                            this.prefManager.getCharPref( this.lockPath ));
                    }else{
                        this.log("nested lock not released");
                    }
                    return true;
                }else{
                    this.log("lock is not its own: " +
                        this.prefManager.getCharPref( this.lockPath ) + " != " + this.id);
                }
            }else{
                this.log("no force neither is empty");
            }
        }catch(e){
            this.log("ERROR Sincronized failed: " + e.message);
            this.log("INFO Releasing the lock");
            this.prefManager.setCharPref( this.lockPath, "" ); //Release the lock
            throw e;
        }
        this.log("syncronized is false");
        return false;
    },
    
    gotLock:function(){
        return this.prefManager.getCharPref( this.lockPath ).toString() == this.id;
    },
    
    /**
    * Function to try to do an operation in sync but gets tired after n retrires
    */
    sincronized_with_patience:function( func, times ){
        for(var t=0; t<times; t++){
            if(this.sincronized(func, t == (times-1))) return true;
            this.log("DEBUG AD.SharedHash#sincronized_with_patience it:"+t);
        }
        this.log("UNREACHABLE CODE REACHED. Internal error. Logs and debugging can be required.");
        return false; //It should not reach here never!
    },
    
    set: function(key, value){
        var next_version = this.id + this.internal_version++;
        var _this = this;
        this.sincronized_with_patience( 
            function(){
                _this.refresh(); //Avoid to ask for sync again
                _this.data[key] = value;
                _this.writeVersion( next_version );
                _this.writeData();
                _this.log("INFO AutomaticDictionary.SharedHash("+_this.id+") write data sucess");
            }, 10 );
    },
    
    get: function(key){
        this.refresh();
        return this.data[key];
    },
    //Updates to last version of data
    refresh:function(){
        if( this.version != this.readVersion() ){
            var _this = this;
            this.sincronized_with_patience(function(){ 
                _this.load()
            }, 10 );
        }
        this.log(this.data.toSource());
    },
    log: function(msg){
        AutomaticDictionary.dump(msg);
    }
}

AutomaticDictionary.Class = function(){
    this.log("ad: init");
    this.running = true;
    this.prefManager = Components.classes["@mozilla.org/preferences-service;1"]
    .getService(Components.interfaces.nsIPrefBranch);
    this.iter = 0; //ObserveRecipients execution counter
    this.data = new AutomaticDictionary.SharedHash( this.ADDRESS_INFO_PREF );
    this.setListeners();
    this.initialized = true;
    this.start();
    return this;
}

AutomaticDictionary.Class.prototype = {
    //Constants
    ADDRESS_INFO_PREF:"extensions.automatic_dictionary.addressesInfo",
    POLLING_DELAY: 3000, //Miliseconds
  
    //Attributes
    initialized: false,
    running: false, //Stopped
    data: null,
    last_timeout: null, //Timer object of the next poll
    instance_number: -1,
  
    stop: function(){
        this.log("ad: stop");
        this.changeLabel("");
        this.running = false;
        if( this.last_timeout ) window.clearTimeout( this.last_timeout );
        this.last_timeout = null;
    },
  
    start: function(){
        this.log("ad: start");
        this.running = true;
        this.observeRecipients();
    },
  
    observeRecipients: function(){
        this.log("ad: observeRecipients");
        if( !this.running ) return;
        this.log("ad: observeRecipients - running");
        this.iter++;
        try{
            this.deduceLanguage();
            //Queue next call
            if( this.running ){
                var _this = this;
                this.last_timeout = setTimeout(function(){
                    _this.observeRecipients();
                }, this.POLLING_DELAY );
            }
        }catch(e){
            this.changeLabel( e.toString());
            throw e;
        }
    },

    //Called when the user changes the language of the dictionary (event based func)
    languageChanged: function( event ){
        this.log("languageChanged by event");
        var current_lang = event.target.value;
        var arr = this.getRecipients();
        if( arr.length > 0 ){
            //The user has set the language for the recipients
            //We update the assignment of language for those recipients
            for( var i in arr){
                this.data.set(arr[i], current_lang);
            }
            this.changeLabel( "Saved " + current_lang + " as default for " +
                arr.length + " recipients" );
        }
    },
  
    deduceLanguage: function(){
        var recipients = this.getRecipients();
        if( recipients.length == 0 ){
            return;
        }
        this.log("Deducing language for: " + recipients.toSource());
        var target_lang = null;
        for( var idx in recipients ){
            var lang = this.getLangFor( recipients[idx] );
            if( lang ){
                target_lang = lang;
                break;
            }else{
                this.changeLabel("No lang saved for these recipìents");
            }
        }
        if(target_lang){
            var worked = false;
            try{
                this.setCurrentLang( target_lang );
                worked = true;
            }catch( e ){
                this.changeLabel( "Error: Could not set lang to "+ target_lang+
                    ". Maybe its not installed any more?" );
                throw e;
            }
            if(worked) this.changeLabel( "Deduced " + target_lang );
        }
    },
  
    setCurrentLang: function( target ){
        var fake_event = {
            target: {
                value: target
            },
            stopPropagation: function(){}
        };
        ChangeLanguage( fake_event );
    },
  
    getLangFor: function( addr ){
        return this.data.get(addr);
    },
  
    getRecipients: function(){
        var fields = Components.classes["@mozilla.org/messengercompose/composefields;1"]
            .createInstance(Components.interfaces.nsIMsgCompFields);
        Recipients2CompFields( fields );
        var nsIMsgRecipientArrayInstance = {
            length:0
        };
        if( fields.to ){
            nsIMsgRecipientArrayInstance = fields.splitRecipients( fields.to, true, {} );
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
  
    setListeners: function(){
        if( window ){
            var _this = this;
            window.addEventListener("compose-window-close", function(){
                _this.stop()
                }, true);
            window.addEventListener('compose-window-reopen', function(){
                _this.start()
                }, true);
            //Try to observe when the dict changes
            document.getElementById("languageMenuList").addEventListener("command",
                function(event){
                    _this.languageChanged(event);
                },false);

            this.log("events seem to be registered");
        }else{
            this.changeLabel("Internal error (Init. listeners)");
            this.log("no window found");
        }
    },

  
    getLabel: function(){
        return document.getElementById("automatic-dictionary-panel");
    },
  
    changeLabel: function( str ){
        var x = this.getLabel();
        if(x)
            x.label = str;
        else
            this.log("no label found");
    },
  
    log:function( msg ){
        AutomaticDictionary.dump( msg );
    }
}

var automatic_dictionary_instance = new AutomaticDictionary.Class();