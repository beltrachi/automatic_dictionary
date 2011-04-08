/**
    Implementation comments:
    
     * To support various compose windows we share the data hash between instances
       of ad, through the preferences service with SharedHash

Listener to:
 Event "Onchange of the dictionary button":
    -> save the language for the current recipients
 Event "Changed recipients list":
    -> deduce language for this recipients
    I DIDNT FIND ANY WAY TO GET THE EVENT. It will be kept as observer.

*/
if( typeof(AutomaticDictionary)=== "undefined" ){
    var AutomaticDictionary = {};
}

/* DEBUGGING METHOD
 *
 * This method is used all over the code to show debugging messages.
 *
 * Uncomment the return to show messages on console
 */
AutomaticDictionary.dump = function(msg){
    return; // DISABLED DUMP! COMMENT TO SHOW MESSAGES!
    if( typeof(msg) == "function"){
        msg = msg();
    }
    dump("AutomaticDictionary: ");
    dump(msg);
    dump("\n");
}

/**
 *   SharedHash is used to share preferences between compose windows in case you
 *   have more than one open window open.
 *   Features:
 *       * When a set is done, it will be available to all SharedHashes through preferences-service
 *       * To spread the changes we save a version number in another preference field
 * 
 *   data stored expires by size in a LRU logic.
 *  
 */
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
    maxSize: null, //Max number of keys.
    //The builder/constructor of the data strucutre (LRU HASH)
    dataConstructor: AutomaticDictionary.Lib.LRUHashV2, 
    
    load: function(){
        this.maxSize = this.prefManager.getIntPref( this.prefPath + ".maxSize" );
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
        var hash = new this.dataConstructor();
        if( v ){
            try{
                hash.fromJSON( v );
            }catch(e){
                //Restore in case it gets wrong status
                this.log("Failed to load data with " + e.toString() );
                hash = new this.dataConstructor();
            }
        }
        //Override max_size
        hash.max_size = this.maxSize;
        this.log( hash.toJSON() );
        return hash;
    },
    writeData:function(){
        return this.prefManager.setCharPref(
            this.prefPath, this.data.toJSON() );
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
                _this.data.set(key, value);
                _this.writeVersion( next_version );
                _this.writeData();
                _this.log("INFO AutomaticDictionary.SharedHash("+_this.id+") write data sucess");
            }, 10 );
    },
    
    get: function(key){
        this.refresh();
        return this.data.get(key);
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
    
    //Version migrations upgrade check
    this.migrate();
    
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
    PREFERENCE_SCOPE: "extensions.automatic_dictionary",
    POLLING_DELAY: 3000, //Miliseconds
  
    //Attributes
    initialized: false,
    running: false, //Stopped
    data: null,
    last_timeout: null, //Timer object of the next poll
    instance_number: -1,
    prefManager: null,
    
    stop: function(){
        if( !this.running ) return; //Already stopped
        this.log("ad: stop");
        this.changeLabel("");
        this.running = false;
        if( this.last_timeout ) window.clearTimeout( this.last_timeout );
        this.last_timeout = null;
    },
  
    start: function(){
        if( this.running ) return; //Already started
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
            this.changeLabel( 
                this.ft( "savedForRecipients",
                    [ current_lang, arr.length ] )
                );
        }
    },
  
    deduceLanguage: function(){
        var recipients = this.getRecipients();
        if( recipients.length == 0 ){
            return;
        }
        this.log("Deducing language for: " + recipients.toSource());
        var target_lang = null;
        // It returns the first recipient that has a language.
        // That is useful but maybe it's not the most convenient way.
        // TODO: Improof deduce algorithm
        for( var idx in recipients ){
            var lang = this.getLangFor( recipients[idx] );
            if( lang ){
                target_lang = lang;
                break;
            }else{
                this.changeLabel(this.t( "noLangForRecipients" ));
            }
        }
        if(target_lang){
            var worked = false;
            try{
                this.setCurrentLang( target_lang );
                worked = true;
            }catch( e ){
                this.changeLabel( this.ft("errorSettingSpellLanguage", [target_lang] ));
                throw e;
            }
            if(worked) this.changeLabel( this.ft("deducedLang", [ target_lang ]))
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
            //Observe when the dict changes
            document.getElementById("languageMenuList").addEventListener("command",
                function(event){
                    _this.languageChanged(event);
                },false);

            window.addEventListener("blur", function(){ _this.stop(); } , true);
            window.addEventListener("focus", function(){ _this.start(); }, true );

            this.log("events seem to be registered");
        }else{
            this.changeLabel(this.t("settingListenersError"));
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

    getStrBundle: function(){
        return document.getElementById("automaticdictionarystrings");
    },

    //Translation (i18n) helper functions
    t: function( key ){
        return this.getStrBundle().getString(key);
    },
    
    ft: function(key, values){
        return this.getStrBundle().getFormattedString(key, values);
    },

    //Log function
    log:function( msg ){
        AutomaticDictionary.dump( msg );
    },
    
    /* Migrations section */
    
    // Upgrades plugin data to current release version
    migrate: function(){
        // Get current migrations applied
        var pref_key = this.PREFERENCE_SCOPE + ".migrations_applied";
        
        var migrations_applied = [];
        var raw_data = this.prefManager.getCharPref( pref_key );
        if( raw_data !== "" ){
            migrations_applied = JSON.parse( raw_data ); 
        }
        
        // Apply all data migrations required
        // Get ordered migrations (by key size)
        var available_migrations = [];
        for( key in this.migrations ){
            available_migrations.push( key )
        }
        
        //Iterate over migration keys and apply them if needed
        available_migrations.sort();
        for( idx in available_migrations ){
            var migration_key = available_migrations[ idx ];
            if( migrations_applied.indexOf( migration_key ) < 0 ){
                //apply migration
                this.log("applying migration "+ migration_key);
                this.migrations[ migration_key ](this);
                migrations_applied.push( migration_key );
                this.log("migration "+ migration_key + " applied successfully");
            }
        }
        this.prefManager.setCharPref( pref_key, JSON.stringify( migrations_applied ) );
    },
    
    //Ordered migrations
    migrations: {
        //Key is date
        "201101010000": function(self){
            self.log("running base migration");
        },
        "201102130000": function(self){
            //Adpat data structure to new one
            // Steps: 1. Load old data. 2. Save as new data
            var prefPath = self.ADDRESS_INFO_PREF;
            var v = self.prefManager.getCharPref( prefPath );
            if( v ){
                try{
                    v = JSON.parse( v );
                }catch(e){
                    self.log("Failed the read of the old preferences. Maybe they were empty.");
                    return; // Nothing to migrate.
                }
            }else{ return; }
            // Save data as new format!
            var maxSize = self.prefManager.getIntPref( prefPath + ".maxSize");
            var lru = new AutomaticDictionary.Lib.LRUHashV2( v, {size: maxSize} );
            self.prefManager.setCharPref(prefPath, lru.toJSON());
        }
    }
}

var automatic_dictionary_instance = new AutomaticDictionary.Class();