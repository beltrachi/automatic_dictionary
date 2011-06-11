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
    MAX_RECIPIENTS_KEY:"extensions.automatic_dictionary.maxRecipients",
    
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
    /*
        Repensar el comportament, ja que quan assignes dict i tens ccs posats, potser no vols
        setejera els tos sols sino només en el cas de que tinguis aquells CCs!!
        
        Per tant quan assignis als TOs, si també tens CCs, només assignaras als TOs si no tenien valor..
        
        si ccs.size > 0
          only_set_if_no_value = true
        fi
        
        .....
    */
    
    languageChanged: function( event ){
        this.log("------------------------------------languageChanged by event");
        var current_lang = event.target.value;
        var tos = this.getRecipients();
        var ccs = this.getRecipients("cc");
        this.log("tos are "+ tos.toSource());
        this.log("ccss are "+ ccs.toSource());
        var maxRecipients = this.getMaxRecipients();
        if( tos.length + ccs.length > maxRecipients ){
            this.log("Discarded to save data. Too much recipients.(maxRecipients is "+maxRecipients+")");
            this.changeLabel( this.ft("DiscardedUpdateTooMuchRecipients", [maxRecipients] ));
            return;
        }
        var saved_recipients = 0;
        if( tos.length > 0 ){
            this.log("Enter cond 1");
            //The user has set the language for the recipients
            //We update the assignment of language for those recipients
            if( tos.length > 1 ){
                this.log("Enter cond 1.1");
                var group = this.stringifyRecipientsGroup( tos );
                this.data.set( group, current_lang );
                saved_recipients += tos.length;
                for( var i in tos){
                    // Save the lang only if it has no lang setted!
                    if( !this.data.get( tos[i] ) ){
                        this.data.set(tos[i], current_lang);
                        saved_recipients++;
                    }
                }
            }else{
                // There is only a "TO"
                
                // We save it if it does not exist.
                // We overwrite it if it's alone but not if it has CCs
                this.log("Enter cond 1.2");
                
                var curr = this.data.get(tos[0]);
                this.log("curr is what is next")
                this.log(curr);
                if( this.isBlank( curr ) || ccs.length == 0 ){
                    this.log("Enter cond 1.2.1");
                    this.data.set(tos[0], current_lang);
                    saved_recipients++;
                }
            }
            
        }
        // Save a lang for tos and ccs
        if( ccs.length > 0 ){
            this.log("Enter cond 2");

            var key = this.getKeyForToAndCCRecipients(tos, ccs);
            this.data.set( key, current_lang );
            saved_recipients += tos.length;
            saved_recipients += ccs.length;
            // Add recipients alone if they are undefined
            var curr = null;
            for( var i = 0; i< ccs.length; i++ ){
                curr = this.data.get( ccs[i] );
                if( this.isBlank( curr )){
                    this.data.set( ccs[i], current_lang );
                    saved_recipients += 1;
                }
            }
            
        }
        if( saved_recipients > 0 ){
            this.log("Enter cond 3");

            this.log("saved recipients are: " + saved_recipients.toSource());
            this.changeLabel( 
                this.ft( "savedForRecipients",
                    [ current_lang, saved_recipients ] )
                );
        }
        this.log("------------------------------------languageChanged by event END");
    },
    
    getKeyForToAndCCRecipients: function(tos, ccs){
        return this.stringifyRecipientsGroup( tos ) + "[cc]" + this.stringifyRecipientsGroup( ccs );
    },
    
    // True when the value is something we consider nonData
    isBlank: function( value ){
        return ((typeof value) == "undefined" || value === "" ||value === null);
    },
    
    // Updates the interface with the lang deduced from the recipients
    /*
        How we search the lang:
         1. TO (all) & CC (all): The recipients in "To" and the ones in "CC". 
                In cases where you change the language when someone in the CC 
                does not understand it.
         2. TO (all): The recipients in "To" all together.
                This allows to recover specific language when the recipients
                are from diferent languages.
         3. TO (one by one): The recipients alone in order of appearence.
    */
    deduceLanguage: function(){
        var recipients = this.getRecipients();
        if( recipients.length == 0 ){
            return;
        }
        var lang = null;
        // TO all and CC all
        var ccs = this.getRecipients("cc");
        var toandcc_key = this.getKeyForToAndCCRecipients( recipients, ccs ); 
        this.log("Deducing language for: " + toandcc_key);
        lang = this.getLangFor( toandcc_key );
        
        if( !lang ){
            this.log("Check for the TO's together")
            // TO all
            // Check if all them have a specific language. We want them ordered to maximize hits
            // Clone array and sort it
            var alltogether_key = this.stringifyRecipientsGroup( recipients );
            lang = this.getLangFor( alltogether_key );
        }
        
        if( !lang ){
            this.log("Check for the TOs one by one");
            // TO one by one
            // It returns the first recipient that has a language.
            // That is useful but maybe it's not the most convenient way.
            for( var idx in recipients ){
                lang = this.getLangFor( recipients[idx] );
                if( lang ){
                    break;
                }
            }
        }
        
        this.log("Language found: "+ lang);
        
        if(lang){
            var worked = false;
            try{
                this.setCurrentLang( lang );
                worked = true;
            }catch( e ){
                this.changeLabel( this.ft("errorSettingSpellLanguage", [lang] ));
                throw e;
            }
            if(worked) this.changeLabel( this.ft("deducedLang", [lang]))
        }else{
            this.changeLabel(this.t( "noLangForRecipients" ));
        }
    },
    
    // It returns a string representing the array of recipients not caring about the order
    stringifyRecipientsGroup: function( arr ){
        var sorted = [];
        for( var k in arr ){
            sorted.push( arr[k] );
        }
        sorted.sort();
        return sorted.toString();
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
  
    getRecipients: function( recipientType ){
        recipientType = recipientType || "to";
        var fields = Components.classes["@mozilla.org/messengercompose/composefields;1"]
            .createInstance(Components.interfaces.nsIMsgCompFields);
        Recipients2CompFields( fields );
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
    
    getMaxRecipients: function(){
        return this.prefManager.getCharPref( this.MAX_RECIPIENTS_KEY );
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
        },
        "201106032254": function(self){
            //Add limit of max_recipients
            var prefPath = self.MAX_RECIPIENTS_KEY;
            var maxRecipients = self.prefManager.getIntPref( prefPath );
            if( self.isBlank( maxRecipients ) ){
                self.prefManager.setIntPref( prefPath, 10);
            }
            
            //Increment max_size of shared_hash param because now we support saving
            //The CCs so 200 can be really low. Should be 1000 at least. A mail with
            // 1 A and 4 CCs generates 6 keys saved. A, A+CCs, CC1, CC2, CC3, CC4
            var factor = 6; // 6 times the current limit
            prefPath = self.ADDRESS_INFO_PREF + ".maxSize";
            var maxSize = self.prefManager.getIntPref( prefPath );
            self.prefManager.setIntPref( prefPath, maxSize * factor );            
        }
    }
}

var automatic_dictionary_instance = new AutomaticDictionary.Class();