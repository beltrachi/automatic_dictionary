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
var EXPORTED_SYMBOLS = ['AutomaticDictionary', "BOOTSTRAP_REASONS"];

var Ci = Components.interfaces;
var Cc = Components.classes;
var Cu = Components.utils;
var Cr = Components.results;

var AutomaticDictionary = this.AutomaticDictionary || {};

AutomaticDictionary.Plugins = {};

AutomaticDictionary.enabled_plugins = [];

//Helper function to copy prototypes
AutomaticDictionary.extend = function (destination,source) {
    if( source == {} || !source ){
        if (AutomaticDictionary.logger){
            AutomaticDictionary.logger.warn("Extension with empty source.");
        }
    }
    for (var property in source)
        destination[property] = source[property];
    return destination;
}

//Window managers are objects that attach to the windows that have the compose
//window to compose mails
AutomaticDictionary.window_managers = [];

var global = this;
var loader = Components.classes["@mozilla.org/moz/jssubscript-loader;1"]
                       .getService(Components.interfaces.mozIJSSubScriptLoader); 
var resources = [
    "chrome://global/content/inlineSpellCheckUI.js",
    "chrome://automatic_dictionary/content/version.js",
    "chrome://automatic_dictionary/content/lib.js",
    "chrome://automatic_dictionary/content/lib/sorted_set.js",
    "chrome://automatic_dictionary/content/lib/lru_hash_v2.js",
    "chrome://automatic_dictionary/content/lib/shared_hash.js",
    "chrome://automatic_dictionary/content/lib/persistent_object.js",
    "chrome://automatic_dictionary/content/lib/locked_object.js",
    "chrome://automatic_dictionary/content/lib/pair_counter.js",
    "chrome://automatic_dictionary/content/lib/freq_table.js",
    "chrome://automatic_dictionary/content/lib/freq_suffix.js",
    "chrome://automatic_dictionary/content/lib/shutdownable.js",
    "chrome://automatic_dictionary/content/lib/logger.js",
    "chrome://automatic_dictionary/content/lib/ga.js",
    "chrome://automatic_dictionary/content/lib/event_dispatcher.js",
    "chrome://automatic_dictionary/content/lib/file_writer.js",
    "chrome://automatic_dictionary/content/lib/mail_composer.js",

    "chrome://automatic_dictionary/content/ad/compose_window.js",
    "chrome://automatic_dictionary/content/ad/compose_window_stub.js",
    "chrome://automatic_dictionary/content/ad/conversations_compose_window.js",

    "chrome://automatic_dictionary/content/ad/plugins/plugin_base.js",
    "chrome://automatic_dictionary/content/ad/plugins/promotions.js",
];

for( var idx in resources){
    var url = resources[idx];
    loader.loadSubScript(url);
}

Cu.import("resource://app/modules/StringBundle.js");

var steelApp = Components.classes["@mozilla.org/steel/application;1"]
    .getService(Components.interfaces.steelIApplication);

Components.utils.import("resource://gre/modules/FileUtils.jsm");

var file = FileUtils.getFile("ProfD", ["automatic_dictionary.log"]);

AutomaticDictionary.log_writer = new AutomaticDictionary.Lib.FileWriter(file.path);
AutomaticDictionary.log_writer.write("Logger started");
AutomaticDictionary.logger = new AutomaticDictionary.Lib.Logger('warn', function(msg){
    steelApp.console.log(msg);
    AutomaticDictionary.log_writer.write(msg);
});
AutomaticDictionary.logger.error("Logger started");
AutomaticDictionary.logger.filepath = file.path;
AutomaticDictionary.logger.addFilter(
    AutomaticDictionary.Lib.LoggerObfuscator(/([^\s"';\:]+@)([\w-.]+)/g,
        (function(){
            var seq = 0;
            return function(match){
                return "masked-email-"+(seq++)+"@domain";
            }
        })()));

AutomaticDictionary.logException = function( e ){
    AutomaticDictionary.logger.error( e.toString() );
    if(e.stack){
        AutomaticDictionary.logger.error( e.stack.toString() );
    }
};

AutomaticDictionary.initWindow = function(window, loaded){
    var idx, cw, load_listener;
    loaded = (loaded === true); //bool cast. loaded default is false
    this.logger.debug("Called initWindow");

    if(!loaded && window.document.readyState != "complete"){
        //Attach onload
        load_listener = function(){
            window.removeEventListener("load", load_listener );
            AutomaticDictionary.initWindow( window, true);
        };
        window.addEventListener("load", load_listener );
    }else{
        if(window.document.location.toString() == "chrome://messenger/content/messenger.xul"){
            this.logger.debug("Main window detected");
            AutomaticDictionary.main_window = window;
        }

        try{
            for(idx in AutomaticDictionary.window_managers){
                cw = AutomaticDictionary.window_managers[idx];
                if( cw.canManageWindow(window)){
                    var ad = new AutomaticDictionary.Class({
                        compose_window_builder: cw,
                        window: window
                    });
                    return ad; //stop loop
                }
            }
        }catch(e){
            this.logger.error("CREATION FAILED");
            AutomaticDictionary.logException(e);
        }
    }
};
AutomaticDictionary.conversations_windows = [];
//Triggered when a conversations is deteccted
AutomaticDictionary.conversationsDetected = function(){
    AutomaticDictionary.ConversationsComposeWindow.fetchWindowAndInit(AutomaticDictionary.main_window);
};

//Shuts down all instances
AutomaticDictionary.shutdown = function(){
    this.logger.debug("Shutdown class call");
    var list = AutomaticDictionary.instances;
    for(var x=0; x<list.length; x++){
        try{
            list[x].shutdown();
        }catch(e){
            this.logException(e);
        }
    }
    AutomaticDictionary.instances = [];
};

//To unload observers
AutomaticDictionary.instances = [];

AutomaticDictionary.Class = function(options){
    //TODO: destroy instances when windows closed, dont keep all in mem!
    AutomaticDictionary.instances.push(this); //Possible memmory leak!
    options = options || {};
    this.window = options.window;
    var start = (new Date()).getTime(), _this = this;
    this.logger.debug("ad: init");

    this.initPlugins();

    this.running = true;
    this.prefManager = this.getPrefManagerWrapper();

    //Version migrations upgrade check
    this.migrate();

    AutomaticDictionary.logger.setLevel(this.logLevel());
    AutomaticDictionary.log_writer.enabled =
        this.prefManager.getBoolPref(this.SAVE_LOG_FILE);


    var cw_builder = options.compose_window_builder || AutomaticDictionary.ComposeWindow;
    this.compose_window = new (cw_builder)(
        {
            "ad": this,
            name: this.name,
            logo_url: this.logo_url,
            notification_time: this.notification_time,
            logger: this.logger
        }
    );

    this.iter = 0; //ObserveRecipients execution counter
    this.data = new AutomaticDictionary.SharedHash( this.ADDRESS_INFO_PREF, {logger: this.logger} );
    this.setListeners();
    this.initialized = true;
    
    this.storage = this.getSimpleStorage(this.prefManager,this.pref_prefix);
    this.ga = new AutomaticDictionary.Lib.GoogleAnalytics({
        domain: this.ga_domain,
        code: this.UA_CODE,
        storage: this.storage,
        window: this.window
    });
    //Heuristic init
    this.initFreqSuffix();
    
    this.collect("compose",
        {customVars:[
                {name:"size",value:this.data.size()},
                {name:"maxRecipients",value:this.getMaxRecipients()},
                {name:"maxSize", value:this.data.maxSize},
                {name:"cw",value:this.compose_window.name}
        ]
    });
    this.collect_event("data","built", {value:((new Date()).getTime() - start)});
    
    this.start();

    //Show warning when loaded
    try{
        var onwindowload = function (event){
            _this.window.removeEventListener("load", onwindowload, false); //remove listener, no longer needed
            _this.showCollectWarning();
            _this.dispatchEvent({type:"window-load"});
        };
        this.window.addEventListener("load", onwindowload ,false);
        //In case window is already loaded
        if(this.window.document.readyState == "complete"){
            onwindowload();
        }
    }catch(e){
        AutomaticDictionary.logException(e);
    }

    //Useful hook for plugins and so on
    this.dispatchEvent({type:"load"});
    return this;
}

AutomaticDictionary.Class.prototype = {
    
    id: "automatic_dictionary_extension@jordi_beltran.net",
    //Constants
    ADDRESS_INFO_PREF:"extensions.automatic_dictionary.addressesInfo",
    PREFERENCE_SCOPE: "extensions.automatic_dictionary",
    MAX_RECIPIENTS_KEY:"extensions.automatic_dictionary.maxRecipients",
    ALLOW_COLLECT_KEY:"allowCollect",
    ALLOW_HEURISTIC:"extensions.automatic_dictionary.allowHeuristic",
    NOTIFICATION_LEVEL:"extensions.automatic_dictionary.notificationLevel",
    LOG_LEVEL:"extensions.automatic_dictionary.logLevel",
    SAVE_LOG_FILE:"extensions.automatic_dictionary.saveLogFile",

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
    notification_time: 4000,
    
    deduce_language_retries_counter: 0,
    deduce_language_retry_delay: 200,
    deduce_language_retry: null,
    //Retries till ifce gets ready
    max_deduce_language_retries: 10,
    
    logo_url: "chrome://automatic_dictionary/content/logo.png",

    logger: AutomaticDictionary.logger,
    
    defaults: (function(prefix){
        var list = {
            "addressesInfo": "",
            "addressesInfo.version": "",
            "addressesInfo.lock": "",
            "addressesInfo.maxSize": 200,
            "migrations_applied": "",
            
            "maxRecipients": 10,
            "allowCollect": true,
            "hasClosedCollectMessage": "false",
            
            "allowHeuristic": true,
            "freqTableData": "",
            "freqTableData.version": "",
            "freqTableData.lock": "",
            
            "first_visit": "",
            "last_session": "",
            "session_number": "",
            "visitor_id": "",

            "allowPromotions": true,
            "notificationLevel": 'info', // or "warn" or "error"
            "logLevel": 'warn',
            "saveLogFile": false,

            //Events collected from
            //we set them as strings as we'll use SimpleStorage
            "stats.data.built": 0,
            "stats.language.saved": 0,
            "stats.language.guessed": 0,
            "stats.language.miss":0,
            "stats.mail.sent":0,
            "stats.process.build_from_hash":0
        };
        var out = {};
        //Add prefix
        for(var k in list){
            out[prefix+k]=list[k];
        }
        return out;
    })("extensions.automatic_dictionary."),
        
    
    stop: function(){
        if( !this.running ) return; //Already stopped
        this.logger.debug("ad: stop");
        this.running = false;
    },
  
    start: function(){
        if( this.running ) return; //Already started
        this.logger.debug("ad: start");
        this.running = true;
    },
    //TODO: move this to another file
    getPrefManagerWrapper:function(){
        var pm = Components.classes["@mozilla.org/preferences-service;1"]
            .getService(Components.interfaces.nsIPrefBranch);
        var defaults = this.defaults;
        var _this = this;
        var orDefault = function(k,func){
            try{
                return func();
            }catch(e){
                _this.logger.debug("Returning default for "+k);
                return defaults[k];
            }
        };
        var getType = function(val,key){
            if((typeof val)== "undefined"){
                //Set type to default type
                val = defaults[key];
            }
            var map = {
                "boolean":"Bool",
                "number":"Int",
                "string":"Char"
            };
            var res = map[(typeof val)] || "Char"; //Char by default
            _this.logger.debug("getType for "+key+" is "+res );
            return res;
        }
        
        var ifce = {
            instance: pm,
            //Direct and unsecure
            set:function(key,val){
                pm["set"+getType(val,key)+"Pref"](key,val);
            },
            //We give value to discover type
            get:function(key,val){
                return pm["get"+getType(val,key)+"Pref"](key,val);
            },
            //getters with fallback to defaults
            getCharPref:function(k){
                return orDefault(k, function(){return pm.getCharPref(k)});
            },
            getIntPref:function(k){
                return orDefault(k, function(){return pm.getIntPref(k)});
            },
            getBoolPref:function(k){
                return orDefault(k, function(){return pm.getBoolPref(k)});
            },
            
            setCharPref: function(k,v){
                return pm.setCharPref(k,v);
            },
            setIntPref: function(k,v){
                return pm.setIntPref(k,v)
            },
            setBoolPref: function(k,v){
                return pm.setBoolPref(k,v);
            },
            inc: function(key, delta){
                AutomaticDictionary.logger.debug("increasing "+key);
                delta = delta || 1;
                var v = ifce.getIntPref(key);
                v = (1 * (v||0)) + delta;
                var res = pm.setIntPref(key,v);
                AutomaticDictionary.logger.debug("up to "+ v);
                return res;
            }
        };
        return ifce;
    },
    //Returns a simple key value store for any type of data.
    //TODO: Migrate prefManager storage to Storage or File
    getSimpleStorage: function(pm, prefix){
        var _this = this;
        var ifce = {
            set: function(key, value){
                return pm.setCharPref( prefix + key, JSON.stringify(value) );
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
            },
            inc: function(key, delta){
                _this.logger.debug("increasing "+key);
                delta = delta || 1;
                var res = ifce.set(key,(1 * ifce.get(key)) + (delta));
                _this.logger.debug("up to "+ ifce.get(key));
                return res;
            }
        };
        return ifce;
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
    
    languageChanged: function(){
        if( !this.running ) return;
        this.logger.debug("languageChanged call");
        var current_lang = this.getCurrentLang();
        var tos = this.getRecipients();
        var ccs = this.getRecipients("cc");
        this.logger.debug("tos are "+ tos.toSource());
        this.logger.debug("ccss are "+ ccs.toSource());
        var maxRecipients = this.getMaxRecipients();
        if( tos.length + ccs.length > maxRecipients ){
            this.logger.warn("Discarded to save data. Too much recipients (maxRecipients is "+maxRecipients+").");
            this.changeLabel( "warn", this.ft("DiscardedUpdateTooMuchRecipients", [maxRecipients] ));
            return;
        }
        var saved_recipients = 0;
        if( tos.length > 0 ){
            this.logger.debug("Enter cond 1");
            //The user has set the language for the recipients
            //We update the assignment of language for those recipients
            if( tos.length > 1 ){
                this.logger.debug("Enter cond 1.1");
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
                this.logger.debug("Enter cond 1.2");
                
                var curr = this.data.get(tos[0]);
                this.logger.debug("curr is what is next")
                this.logger.debug(curr);
                if( this.isBlank( curr ) || ccs.length == 0 ){
                    this.logger.debug("Enter cond 1.2.1");
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
            this.logger.debug("Enter cond 2");

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
            if(this.deduce_language_retry){
                this.deduce_language_retry.stop();
                this.deduce_language_retry = null;
            }
            this.last_lang = current_lang;
            this.logger.debug("Enter cond 3");

            this.logger.debug("saved recipients are: " + saved_recipients);
            this.changeLabel("info",
                this.ft( "savedForRecipients",
                    [ current_lang, saved_recipients ] )
                );
        }
        this.collect_event("language","saved", {label: current_lang});
    },

    getKeyForToAndCCRecipients: function(tos, ccs){
        return this.stringifyRecipientsGroup( tos ) + "[cc]" + this.stringifyRecipientsGroup( ccs );
    },
    
    // True when the value is something we consider nonData
    isBlank: function( value ){
        return ((typeof value) == "undefined" || value === "" ||value === null);
    },
    
    save_heuristic: function(recipient, lang){
        this.logger.debug("saving heuristic for "+ recipient + " to "+ lang);
        var parts = recipient.split("@");
        if( parts[1] ){
            this.freq_suffix.add(parts[1], lang);
        }
    },
    
    remove_heuristic: function(recipient, lang){
        this.logger.debug("removing heuristic for "+ recipient + " to "+ lang);
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
    deduceLanguage: function( opt ){
        var self = this;
        if(!opt) opt = {};

        if( !this.canSpellCheck() ){
            //TODO: notify user when spellcheck while you type is disabled.
            if( this.running && (!opt.count || opt.count < 10)){
                this.logger.info("Deferring deduceLanguage because spellchecker"+
                                 " is not ready");
                opt.count = opt.count || 0;
                opt.count += 1;
                this.window.setTimeout(function(){ self.deduceLanguage(opt) },300);
            }else{
                this.logger.warn("spellchecker is not enabled or not running");
            }
            return;
        }

        if( !opt.is_retry && this.deduce_language_retry ){
            this.logger.info("Cancelled a deduceLanguage call as there is a retry waiting...");
            // There is a retry queued. Stay quiet and wait for it.
            return;
        }

        var recipients = this.getRecipients();
        if( !this.running || recipients.length == 0 ){
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
        this.logger.debug("Deducing language for: " + toandcc_key);
        lang = this.getLangFor( toandcc_key );
        
        if( !lang ){
            this.logger.debug("Check for the TO's together")
            // TO all
            // Check if all them have a specific language. We want them ordered to maximize hits
            // Clone array and sort it
            var alltogether_key = this.stringifyRecipientsGroup( recipients );
            lang = this.getLangFor( alltogether_key );
        }
        
        if( !lang ){
            this.logger.debug("Check for the TOs one by one");
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
            this.logger.debug("Check for the ccs one by one");
            for(i in ccs){
                lang = this.getLangFor( ccs[i] );
                if( lang ){
                    break;
                }
            }
        }
        
        this.logger.debug("Language found: "+ lang);
                
        if(!lang && this.allowHeuristic()){
            lang = this.heuristic_guess(recipients);
            if(lang){
                method = this.METHODS.GUESS;
                this.logger.debug("Heuristic says: "+ lang);            
            }
        }
        
        // Rule: when you detect a language and you detected it last time,
        // Set it again if it's not the current. (Support multi compose windows) 
        var nothing_changed = this.last_toandcc_key == toandcc_key && 
            this.last_lang == lang;
        if( nothing_changed ){
            //test that the last lang is the same as the one setted on the dictionary.
            if( this.isBlank(lang) || this.getCurrentLang() == lang){
                this.logger.debug("deduceLanguage detects that nothing changed or lang is null");
                return;
            }else{
                this.logger.debug("Detected changes on langs (from-to): "+ [this.getCurrentLang(), lang].toSource());
            }
        }

        if(lang){
            try{
                this.setCurrentLang( lang );
                if( !nothing_changed ){
                    this.changeLabel("info", this.ft("deducedLang."+method, [lang]))
                    this.collect_event("language",method, {label:lang}, {customVars: ga_customVars});
                }
            }catch( e ){
                AutomaticDictionary.logException(e);
                this.logger.error("Exception message on deduceLanguage is: "+ e.toString());
                if( this.deduce_language_retries_counter < this.max_deduce_language_retries ){
                    // The interface may not be ready. Leave it a retry.
                    this.deduce_language_retries_counter++
                    this.logger.info("Recovering from exception on deduceLanguage " + 
                        "(retry: " +this.deduce_language_retries_counter + " with delay "+
                        this.deduce_language_retry_delay+" )");
                    var _this = this;
                    this.deduce_language_retry = this.window.setTimeout(function(){
                        _this.logger.info("Relaunching deduceLanguage");
                        _this.deduce_language_retry = null;
                        _this.deduceLanguage({is_retry:true});
                    }, this.deduce_language_retry_delay);
                    return;
                }else{
                    this.changeLabel("error", this.ft("errorSettingSpellLanguage", [lang] ));
                    this.collect_event("error","deduceLanguage", {label:e.toString()}, {customVars: ga_customVars});
                    throw e;
                }
            }
            this.deduce_language_retries_counter = 0;
        }else{
            this.changeLabel("info", this.t( "noLangForRecipients" ));
            this.collect_event("language","miss",{}, {customVars: ga_customVars});
        }
        this.last_lang = lang;
        this.last_toandcc_key = toandcc_key;
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
        this.last_lang = target;
        //Temporary disable language change detection that we trigger ourself
        this.running = false;
        try{
            if( this.compose_window.changeLanguage ){
                this.compose_window.changeLanguage( fake_event );
            }else if( this.window.ChangeLanguage ){
                this.window.ChangeLanguage( fake_event );
            }else{
                this.logger.error("No way to change language");
                this.changeLabel("error", this.t("errorNoWayToChangeLanguage") );
            }
        }catch(e){
            this.logger.error("Exception received on setCurrentLang");
            this.logger.error(e);
            this.logger.info("Updating default dictionary instead as maybe spellcecher is not ready.");
            this.prefManager.setCharPref("spellchecker.dictionary",target);
        }finally{
            this.running = true;
        }
    },
    //Take care as this language is globally set.
    getCurrentLang: function(){
        return this.prefManager.getCharPref("spellchecker.dictionary");
    },

    canSpellCheck:function(){
        var is = this.window.gSpellChecker.canSpellCheck && this.isSpellCheckerEnabled();
        return is;
    },

    isSpellCheckerEnabled:function(){
        var is = this.window.gSpellChecker.enabled;
        return is;
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

    changeLabel: function(level, str){
        var arr = ["info","warn","error"];
        // level is equal or higher than configured level
        if( arr.indexOf(level) >= arr.indexOf(this.notificationLevel()) ){
            return this.compose_window.changeLabel( str );
        }
    },
    
    //To show messages to the user
    showMessage:function( str, options ){
        return this.compose_window.showMessage(str, options);
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
                        _this.storage.set("hasClosedCollectMessage",true);
                        _this.prefManager.setBoolPref(
                            _this.pref_prefix + _this.ALLOW_COLLECT_KEY, false);
                    },
                    label: this.t("DontDoIt"),
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
        if(!this.string_bundle){
            this.string_bundle = new StringBundle("chrome://automatic_dictionary/locale/strings.properties");
        }
        return this.string_bundle;
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
        this.logger.debug( msg );
    },
    
    getMaxRecipients: function(){
        return this.prefManager.getIntPref( this.MAX_RECIPIENTS_KEY );
    },
    
    allowHeuristic: function(){
        return this.prefManager.getBoolPref(this.ALLOW_HEURISTIC);
    },
    
    allowCollect: function(){
        return this.prefManager.getBoolPref(this.pref_prefix + this.ALLOW_COLLECT_KEY);
    },
    notificationLevel: function(){
        return this.prefManager.get(this.NOTIFICATION_LEVEL);
    },
    logLevel: function(){
        return this.prefManager.get(this.LOG_LEVEL);
    },
    // options are forwarded to ga.visit function
    collect: function(visit, options){
        this.last_visit = visit;
        if( this.allowCollect() ){
            this.logger.debug("collect for visit "+visit);
            this.ga.visit(visit, options);
        }else{
            this.logger.debug("DISABLED track for visit "+visit);
        }
    },
    collect_event: function(category, action, e_opts, options){
        //Update internal stats
        this.prefManager.inc(this.pref_prefix + "stats." + category+"."+action);
        
        if( this.allowCollect() ){
            e_opts = e_opts || {};
            this.logger.debug("collect for event "+action+" on "+category);
            this.ga.event(this.last_visit, {
                cat:category,
                action:action,
                label: e_opts.label,
                value: e_opts.value,
                non_interaction: e_opts.non_interaction
            }, options);
        }else{
            this.logger.debug("DISABLED track for action "+action);            
        }
        
        this.dispatchEvent({type:category, data:{action: action}});
    },
    
    counterFor:function(key){
        var alias = {
            "usages":"data.built"
        }
        if( alias[key]) 
            key = alias[key];
        var ret = this.prefManager.getIntPref(this.pref_prefix + "stats." + key);
        this.logger.debug("CunterFor "+key+ " is "+ret);
        return ret;
    },
    
    shutdown:function(){
        this.logger.debug("Shutdown instance call");
        this.dispatchEvent({type:"shutdown"});
        this.compose_window.shutdown();
        AutomaticDictionary.log_writer.close();
    },
    
    //TODO: migrate to observable/observer pattern
    notifyMailSent:function(){
        this.logger.debug("Mail sent event");
        this.collect_event("mail","sent");
    },
    
    //It sets default values in case they are not setted
    setDefaults:function(){
        var v;
        //set all default values
        for(var k in this.defaults){
            try{
                this.logger.debug("Value for "+k+ " is ");
                v = this.prefManager.get(k,this.defaults[k]);
                this.logger.debug(v);
            }catch(e){
                // a get on a non existing key raises an exception.
                v = null;
            }
            if(v === null || typeof(v) == 'undefined'){
                this.logger.debug("setting default for "+k);
                this.prefManager.set(k,this.defaults[k]);
            }
        }
    },
    
    initPlugins: function(){
        var list = AutomaticDictionary.enabled_plugins;
        for(var x=0; x< list.length; x++){
            var plugin = list[x];
            try{
                plugin.init(this);
            }catch(e){
                this.logger.error("Plugin init error");
                AutomaticDictionary.logException(e);
            }
        }
        this.dispatchEvent({type:"plugins-initialized"});
    },
    
    //Wrappers to set preferences without managing prefixes
    getPref:function(key){
        return this.prefManager.get(this.pref_prefix + key);
    },
    
    setPref:function(key, value){
        return this.prefManager.set(this.pref_prefix + key, value);
    },

    /* Migrations section */
    
    //TODO: move migrations thing apart.
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
                this.logger.info("applying migration "+ migration_key);
                this.migrations[ migration_key ](this);
                migrations_applied.push( migration_key );
                this.logger.info("migration "+ migration_key + " applied successfully");
            }
        }
        this.prefManager.setCharPref( pref_key, JSON.stringify( migrations_applied ) );
    },
    
    //Ordered migrations
    migrations: {
        //Key is date
        "201101010000": function(self){
            self.logger.debug("running base migration");
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
                    self.logger.debug("Failed the read of the old preferences. Maybe they were empty.");
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
            //Allow collect data by default
            self.prefManager.setBoolPref( self.pref_prefix + self.ALLOW_COLLECT_KEY, true);
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
                self.logger.debug("migrating to generate freq_suffix with "+JSON.stringify(keys));
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
        },
        "201302272039": function(self){
            //Migrated to restartless
            self.setDefaults();
        },
        "201303021735": function(self){
            //Added internal stats
            self.setDefaults();
        },
        "201405132246": function(self){
            //Added notificationLevel
            self.setDefaults();
        },
        "201501011313": function(self){
            //Added notificationLevel
            self.setDefaults();
        },
        "201501061812": function(self){
            //Added saveLogFile
            self.setDefaults();
        }
    }
};

AutomaticDictionary.extend( AutomaticDictionary.Class.prototype, AutomaticDictionary.EventDispatcher);
