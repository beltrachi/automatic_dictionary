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


AutomaticDictionary.Class = function(options){
    options = options || {};
    var start = (new Date()).getTime(), _this = this;
    this.log("ad: init");
    this.running = true;
    this.prefManager = Components.classes["@mozilla.org/preferences-service;1"]
    .getService(Components.interfaces.nsIPrefBranch);
    this.compose_window = options.compose_window || 
        new AutomaticDictionary.ComposeWindow(
        {
            "ad": this,
            name: this.name,
            logo_url: this.logo_url,
            notification_time: this.notification_time
        }
    );
    //Version migrations upgrade check
    this.migrate();
    
    this.iter = 0; //ObserveRecipients execution counter
    this.data = new AutomaticDictionary.SharedHash( this.ADDRESS_INFO_PREF );
    this.setListeners();
    this.initialized = true;
    
    this.storage = this.getSimpleStorage(this.prefManager,this.pref_prefix);
    this.ga = new AutomaticDictionary.Lib.GoogleAnalytics({
        domain: this.ga_domain,
        code: this.UA_CODE,
        storage: this.storage
    });
    //Heuristic init
    this.initFreqSuffix();
    
    this.collect("compose",
        {customVars:[
                {name:"size",value:this.data.size()},
                {name:"maxRecipients",value:this.getMaxRecipients()},
                {name:"maxSize", value:this.data.maxSize}
        ]
    });
    this.collect_event("data","built", {value:((new Date()).getTime() - start) });
    
    this.start();
    
    //Show warning when loaded
    try{
        window.addEventListener("load", function load(event){
            window.removeEventListener("load", load, false); //remove listener, no longer needed
            _this.showCollectWarning();  
        },false);
    }catch(e){
        this.log(e);
    }

    return this;
}

AutomaticDictionary.Class.prototype = {
    //Constants
    ADDRESS_INFO_PREF:"extensions.automatic_dictionary.addressesInfo",
    PREFERENCE_SCOPE: "extensions.automatic_dictionary",
    MAX_RECIPIENTS_KEY:"extensions.automatic_dictionary.maxRecipients",
    ALLOW_COLLECT_KEY:"extensions.automatic_dictionary.allowCollect",
    ALLOW_HEURISTIC:"extensions.automatic_dictionary.allowHeuristic",
    
    METHODS:{
        REMEMBER:"remember",
        GUESS:"guess"
    },
    
    FREQ_TABLE_KEY:"freqTableData",
    
    POLLING_DELAY: 3000, //Miliseconds
    
    UA_CODE: "UA-35579454-1",
    pref_prefix: "extensions.automatic_dictionary.",
    ga_domain: "automatic_dictionary",
  
    //Attributes
    initialized: false,
    running: false, //Stopped
    data: null,
    last_timeout: null, //Timer object of the next poll
    instance_number: -1,
    prefManager: null,
    ga: null,
    last_toandcc_key: null,
    name: "AutomaticDictionary",
    notification_time: 3000,
    
    logo_url: "chrome://automatic_dictionary/content/logo.png",
    
    stop: function(){
        if( !this.running ) return; //Already stopped
        this.log("ad: stop");
        this.changeLabel("");
        this.running = false;
    },
  
    start: function(){
        if( this.running ) return; //Already started
        this.log("ad: start");
        this.running = true;
    },
    
    //Returns a simple key value store for any type of data.
    getSimpleStorage: function(pm, prefix){
        return {
            set: function(key, value){
                pm.setCharPref( prefix + key, JSON.stringify(value) );
            },
            get: function(key){
                var data=null;
                //When data is not initialized, it raises an error.
                try{ 
                    data = pm.getCharPref( prefix + key );
                    if( data != ""){
                        data = JSON.parse(data);
                    }
                }catch(e){}
                return data;
            }
        };
    },
    
    initFreqSuffix: function(){
        //Build the object that will manage the storage and locking for the object
        var persistent_wrapper = new AutomaticDictionary.Lib.PersistentObject(
            this.FREQ_TABLE_KEY,
            this.storage,
            {
                read:["get","pairs"],
                write:["add","remove"],
                serializer: "toJSON",
                loader:"fromJSON"
            },
            function(){
                return new AutomaticDictionary.Lib.FreqSuffix();
            }
        );
        this.freq_suffix = new AutomaticDictionary.Lib.LockedObject(
            this.FREQ_TABLE_KEY,
            this.storage,
            {
                non_locking:["get","pairs"],
                locking:["add","remove"],
                reload: "reload"
            },
            persistent_wrapper
        );
        var _this = this;
        this.data.expiration_callback = function(pair){
            _this.remove_heuristic(pair[0],pair[1]);
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
                        this.save_heuristic(tos[i], current_lang);
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
                    if( !this.isBlank(curr) ){
                        this.remove_heuristic(tos[0], curr);
                    }
                    this.save_heuristic(tos[0], current_lang);
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
                    this.save_heuristic(ccs[i], current_lang);
                    saved_recipients += 1;
                }
            }
            
        }
        if( saved_recipients > 0 ){
            this.last_lang = current_lang;
            this.log("Enter cond 3");

            this.log("saved recipients are: " + saved_recipients);
            this.changeLabel( 
                this.ft( "savedForRecipients",
                    [ current_lang, saved_recipients ] )
                );
        }
        this.collect_event("language","saved", {label: current_lang});
        this.log("------------------------------------languageChanged by event END");
    },
    
    getKeyForToAndCCRecipients: function(tos, ccs){
        return this.stringifyRecipientsGroup( tos ) + "[cc]" + this.stringifyRecipientsGroup( ccs );
    },
    
    // True when the value is something we consider nonData
    isBlank: function( value ){
        return ((typeof value) == "undefined" || value === "" ||value === null);
    },
    
    save_heuristic: function(recipient, lang){
        this.log("saving heuristic for "+ recipient + " to "+ lang);
        var parts = recipient.split("@");
        if( parts[1] ){
            this.freq_suffix.add(parts[1], lang);
        }
    },
    
    remove_heuristic: function(recipient, lang){
        this.log("removing heuristic for "+ recipient + " to "+ lang);
        var parts = recipient.split("@");
        if( parts[1] ){
            this.freq_suffix.remove(parts[1], lang);
        }
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
        var lang = null, method = this.METHODS.REMEMBER, i;
        // TO all and CC all
        var ccs = this.getRecipients("cc");
        var toandcc_key = this.getKeyForToAndCCRecipients( recipients, ccs ); 
        var ga_customVars = [
                {name:"to",value:recipients.length},
                {name:"cc",value:ccs.length}
        ];
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
        
        if( !lang ){
            this.log("Check for the ccs one by one");
            for(i in ccs){
                lang = this.getLangFor( ccs[i] );
                if( lang ){
                    break;
                }
            }
        }
        
        this.log("Language found: "+ lang);
                
        if(!lang && this.allowHeuristic()){
            lang = this.heuristic_guess(recipients);
            if(lang)
                method = this.METHODS.GUESS;
        }
        
        // Rule: when you detect a language and you detected it last time,
        // Set it again if it's not the current. (Support multi compose windows) 
        if( this.last_toandcc_key == toandcc_key && 
            this.last_lang == lang ){
            //test that the last lang is the same as the one setted on the dictionary.
            if( this.isBlank(lang) || this.getCurrentLang() == lang){
                this.log("deduceLanguage detects that nothing changed or lang is null");
                return;
            }else{
                this.log("Detected changes on langs: "+ [lang, this.getCurrentLang()].toSource());
            }
        }

        
        this.last_lang = lang;
        this.last_toandcc_key = toandcc_key;
        if(lang){
            try{
                this.setCurrentLang( lang );
                this.changeLabel( this.ft("deducedLang."+method, [lang]))
                this.collect_event("language",method, {label:lang}, {customVars: ga_customVars});
            }catch( e ){
                this.changeLabel( this.ft("errorSettingSpellLanguage", [lang] ));
                throw e;
            }
        }else{
            this.changeLabel(this.t( "noLangForRecipients" ));
            this.collect_event("language","miss",{}, {customVars: ga_customVars});
        }
    },
    
    //Tries to guess by other recipients domains
    heuristic_guess: function(recipients){
        var recipient, parts, rightside, lang,
            freq_table = new AutomaticDictionary.Lib.FreqTable();

        for(var i=0; i < recipients.length; i++){
            recipient = recipients[i];
            parts = recipient.split("@");
            rightside = parts[parts.length-1];
            lang = this.freq_suffix.get(rightside,true);
            if( lang ){
                freq_table.add(lang);
            }
        }
        return freq_table.getFirst();
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
        //function defined in mailnews/compose/MsgComposeCommands.js
        ChangeLanguage( fake_event );
    },
    //Take care as this language is globally set.
    getCurrentLang: function(){
        var spellChecker = Components.classes["@mozilla.org/spellchecker/engine;1"]
        .getService(Components.interfaces.mozISpellCheckingEngine);
        return spellChecker.dictionary;
    },
  
    getLangFor: function( addr ){
        return this.data.get(addr);
    },
  
    getRecipients: function( recipientType ){
        return this.compose_window.recipients(recipientType);
    },
  
    setListeners: function(){
        return this.compose_window.setListeners();
    },

  
    changeLabel: function( str ){
        return this.compose_window.changeLabel( str );
    },
    
    //To show messages to the user
    showMessage:function( str, options ){
        return this.compose_window.show_message(str, options);
    },
    
    showCollectWarning:function(){
        var _this = this;
        if(!this.storage.get("hasClosedCollectMessage") && !this.shown_collect_message){
            this.showMessage(this.t("WeAreCollectingData"),{buttons:[
                {
                    callback:function(){
                        _this.storage.set("hasClosedCollectMessage",true);
                    },
                    label: this.t("IMOKWithIt"),
                    accessKey: ""
                },
                {
                    callback:function(){
                        var url='https://github.com/beltrachi/automatic_dictionary/blob/master/COLLECTED_DATA.md';
                        var messenger = Components.classes["@mozilla.org/messenger;1"].createInstance();
                        messenger = messenger.QueryInterface(Components.interfaces.nsIMessenger);
                        messenger.launchExternalURL(url);
                    },
                    label: this.t("MoreInfo"),
                    accessKey: ""
                }
                
            ]
            });
            this.shown_collect_message = true;
        }
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
        return this.prefManager.getIntPref( this.MAX_RECIPIENTS_KEY );
    },
    
    allowHeuristic: function(){
        return this.prefManager.getBoolPref(this.ALLOW_HEURISTIC);
    },
    
    allowCollect: function(){
        return this.prefManager.getBoolPref(this.ALLOW_COLLECT_KEY);
    },
    // options are forwarded to ga.visit function
    collect: function(visit, options){
        this.last_visit = visit;
        if( this.allowCollect() ){
            this.log("collect for visit "+visit);
            this.ga.visit(visit, options);
        }else{
            this.log("DISABLED track for visit "+visit);            
        }
    },
    collect_event: function(category, action, e_opts, options){
        if( this.allowCollect() ){
            e_opts = e_opts || {};
            this.log("collect for event "+action+" on "+category);
            this.ga.event(this.last_visit, {
                cat:category,
                action:action,
                label: e_opts.label,
                value: e_opts.value,
                non_interaction: e_opts.non_interaction
            }, options);
        }else{
            this.log("DISABLED track for action "+action);            
        }
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
        for( var key in this.migrations ){
            available_migrations.push( key )
        }
        
        //Iterate over migration keys and apply them if needed
        available_migrations.sort();
        for( var idx in available_migrations ){
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
            }else{
                return;
            }
            // Save data as new format!
            var maxSize = self.prefManager.getIntPref( prefPath + ".maxSize");
            var lru = new AutomaticDictionary.Lib.LRUHashV2( v, {
                size: maxSize
            } );
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
        },
        "201210142159": function(self){
            //Add limit of max_recipients
            self.prefManager.setBoolPref( self.ALLOW_COLLECT_KEY, true);
        },
        "201210192306": function(self){
            //Add limit of max_recipients
            self.prefManager.setBoolPref( self.ALLOW_HEURISTIC, true);
        },
        "201211112134": function(self){
            //Add freq table base data
            //Tricky trick to overwrite the start method and trigger the freq
            //update when it's first time called
            var start = self.start, runned = false;
            self.start = function(){
                var start_at = (new Date()).getTime(),
                    keys = self.data.keys(), key, lang;
                self.log("migrating to generate freq_suffix with "+JSON.stringify(keys));
                for(var i=0;i< keys.length;i++){
                    key = keys[i];
                    //Only use single items, exclude grouped ones
                    //Coma is used to separate values
                    if(key.indexOf(",") === -1 && key.indexOf("[cc]") === -1){
                        lang = self.data.get(key);
                        if(lang){
                            self.save_heuristic(key,lang);
                        }
                    }
                }
                self.collect_event("process","build_from_hash",
                    {value:((new Date()).getTime() - start_at)}
                );
                //Undo the trick and call start.
                self.start = start;
                start.apply(self);
            }
        }   
    }
}

var automatic_dictionary_instance = new AutomaticDictionary.Class();