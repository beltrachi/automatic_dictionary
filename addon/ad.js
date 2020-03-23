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
//var EXPORTED_SYMBOLS = ['AutomaticDictionary'];

//var Cu = Components.utils;
//var Cr = Components.results;

let AutomaticDictionary = {};

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

// Ugly thing to reduce changes needed on code.
import * as version from './version.js';
version.apply(AutomaticDictionary);
import * as lib from './lib.js';
lib.apply(AutomaticDictionary);
import * as sorted_set from './lib/sorted_set.js';
sorted_set.apply(AutomaticDictionary);
import * as lru_hash_v2 from './lib/lru_hash_v2.js';
lru_hash_v2.apply(AutomaticDictionary);
import * as shared_hash from './lib/shared_hash.js';
shared_hash.apply(AutomaticDictionary);
import * as persistent_object from './lib/persistent_object.js';
persistent_object.apply(AutomaticDictionary);
// import * as locked_object from './lib/locked_object.js';
// locked_object.apply(AutomaticDictionary);
import * as pair_counter from './lib/pair_counter.js';
pair_counter.apply(AutomaticDictionary);
import * as freq_table from './lib/freq_table.js';
freq_table.apply(AutomaticDictionary);
import * as freq_suffix from './lib/freq_suffix.js';
freq_suffix.apply(AutomaticDictionary);
import * as shutdownable from './lib/shutdownable.js';
shutdownable.apply(AutomaticDictionary);
import * as logger from './lib/logger.js';
logger.apply(AutomaticDictionary);
import * as event_dispatcher from './lib/event_dispatcher.js';
event_dispatcher.apply(AutomaticDictionary);
// import * as file_writer from './lib/file_writer.js';
// file_writer.apply(AutomaticDictionary);
import * as mail_composer from './lib/mail_composer.js';
mail_composer.apply(AutomaticDictionary);
import * as migrations from './ad/migrations.js';
migrations.apply(AutomaticDictionary);
import * as compose_window from './ad/compose_window.js';
compose_window.apply(AutomaticDictionary);
import * as compose_window_stub from './ad/compose_window_stub.js';
compose_window_stub.apply(AutomaticDictionary);
// import * as conversations_compose_window from './ad/conversations_compose_window.js';
// conversations_compose_window.apply(AutomaticDictionary);
import * as plugin_base from './ad/plugins/plugin_base.js';
plugin_base.apply(AutomaticDictionary);
import * as promotions from './ad/plugins/promotions.js';
promotions.apply(AutomaticDictionary);

// Cu.import("resource://gre/modules/Log.jsm");

// let log = Log.repository.getLogger("AutomaticDictionary");
// log.level = Log.Level.Debug;
// // A console appender logs to the browser console.
// log.addAppender(new Log.ConsoleAppender(new Log.BasicFormatter()));
// // A dump appender logs to stdout.
// log.addAppender(new Log.DumpAppender(new Log.BasicFormatter()));

// Cu.import("resource://gre/modules/FileUtils.jsm");
// Cu.import("resource://gre/modules/Services.jsm");
// Cu.import("resource://gre/modules/AppConstants.jsm");

// var file = FileUtils.getFile("ProfD", ["automatic_dictionary.log"]);

// AutomaticDictionary.log_writer = new AutomaticDictionary.Lib.FileWriter(file.path);
// AutomaticDictionary.log_writer.write("Log file writer started");
AutomaticDictionary.logger = new AutomaticDictionary.Lib.Logger('debug', function(msg){
  console.info(msg);
  //AutomaticDictionary.log_writer.write(msg);
});
AutomaticDictionary.logger.warn("Logger started");
//AutomaticDictionary.logger.warn("Thunderbird version is "+ AppConstants.MOZ_APP_VERSION);
// AutomaticDictionary.logger.filepath = file.path;
// AutomaticDictionary.logger.addFilter(
//     AutomaticDictionary.Lib.LoggerObfuscator(/([^\s"';\:]+@)([\w-.]+)/g,
//         (function(){
//             var seq = 0;
//             return function(match){
//                 return "masked-email-"+(seq++)+"@domain";
//             }
//         })()));

AutomaticDictionary.logException = function( e ){
  try {
    AutomaticDictionary.logger.error( e.toString() );
    if(e.stack){
      AutomaticDictionary.logger.error( e.stack.toString() );
    }
  }catch(e){
    console.error(e);
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
  //    this.thunderbirdVersion = AppConstants.MOZ_APP_VERSION;
  var start = (new Date()).getTime(), _this = this;
  this.logger.debug("ad: init");

  this.initPlugins();

  this.running = true;
  var _this = this;
  this.getPrefManagerWrapperAsync().then(function(pm){
    console.log("prefmanagerasync in func");
    _this.prefManager = pm;
    //Version migrations upgrade check
    _this.migrate().then(function(){
      console.log("in migrate func");
      _this.logLevel().then(function(level){
        //TODO enable this! AutomaticDictionary.logger.setLevel(level);
      });
      console.log("Ix");
      _this.prefManager.getBoolPref(_this.SAVE_LOG_FILE).then(function(value){
        //AutomaticDictionary.log_writer.enabled = value;
      });

      console.log("Ix");
      browser.windows.onRemoved.addListener(function(windowId){
        if (_this.window.id != windowId){
          console.log("Not this window closed");
          return;
        }
        console.log("Shutting down ad on this window");
        _this.shutdown();
      });

      var cw_builder = options.compose_window_builder || AutomaticDictionary.ComposeWindow;
      _this.compose_window = new cw_builder(
        {
          ad: _this,
          name: _this.name,
          logo_url: _this.logo_url,
          notification_time: _this.notification_time,
          logger: _this.logger,
          window: window
        }
      );
      console.log("Ix");

      _this.storage = _this.getSimpleStorage(_this.prefManager, _this.pref_prefix);
      //Heuristic init
      _this.logger.info("before initialize data");
      _this.initializeData();
      console.log("Ix");
      _this.setListeners();
      _this.initialized = true;
      _this.initFreqSuffix();
      console.log("Ix");

      // Count the number of times it has been initialized.
      _this.storage.inc('stats.usages');

      _this.start();
      //Useful hook for plugins and so on
      _this.dispatchEvent({type:"load"});
    }).catch(console.error);
  }).catch(console.error);


  this.iter = 0; //ObserveRecipients execution counter

  return this;
}

AutomaticDictionary.Class.prototype = {
  
  id: "automatic_dictionary_extension@jordi_beltran.net",
  //Constants
  ADDRESS_INFO_KEY:"addressesInfo",
  MAX_RECIPIENTS_KEY:"maxRecipients",
  ALLOW_HEURISTIC:"allowHeuristic",
  NOTIFICATION_LEVEL:"notificationLevel",
  LOG_LEVEL:"logLevel",
  SAVE_LOG_FILE:"saveLogFile",

  METHODS:{
    REMEMBER:"remember",
    GUESS:"guess"
  },
  
  FREQ_TABLE_KEY:"freqTableData",
  
  POLLING_DELAY: 3000, //Miliseconds
  
  pref_prefix: "extensions.automatic_dictionary.",

  //Attributes
  initialized: false,
  running: false, //Stopped
  data: null,
  last_timeout: null, //Timer object of the next poll
  instance_number: -1,
  prefManager: null,
  last_toandcc_key: null,
  name: "AutomaticDictionary",
  notification_time: 4000,
  
  deduce_language_retries_counter: 0,
  deduce_language_retry_delay: 200,
  deduce_language_retry: null,
  //Retries till ifce gets ready
  max_deduce_language_retries: 10,
  
  logo_url: browser.runtime.getURL("logo.png"),

  logger: AutomaticDictionary.logger,
  
  defaults: (function(prefix){
    var list = {
      "addressesInfo": "",
      "addressesInfo.version": "",
      "addressesInfo.lock": "",
      "addressesInfo.maxSize": 200,
      "migrations_applied": "",
      
      "maxRecipients": 10,
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
      "logLevel":"debug",
      "saveLogFile":"true",
      "stats.usages": 0
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
  getPrefManagerWrapperAsync: async function(){
    console.log("X");
    var pm = browser.prefs;
    console.log("X");
    var defaults = this.defaults;
    var _this = this;
    var logger = console;
    console.log("X");
    var orDefault = async function(k,func){
      try{
        var value = await func();
        if(value == null){
          value = defaults[k];
        }
      }catch(e){
        value = defaults[k];
      }
      return value;
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
      logger.debug("getType for "+key+" is "+res );
      return res;
    }
    console.log("X");
    var ifce = {
      instance: pm,
      //Direct and unsecure
      set: async function(key,val){
        return await pm["set"+getType(val,key)+"Pref"](key,val);
      },
      //We give value to discover type
      get: async function(key,val){
        logger.info("get char pref");
        logger.info(key);
        logger.info(val);
        val = val || defaults[key];
        if (typeof(val) == "undefined"){
          return await pm["get"+getType(val,key)+"Pref"](key);
        }else{
          return await pm["get"+getType(val,key)+"Pref"](key,val);
        }
      },
      get_or_raise: async function(key,val){
        return await pm["get"+getType(val,key)+"Pref"](key);
      },
      //getters with fallback to defaults
      getCharPref:async function(k){
        return await orDefault(k, async function(){return await pm.getCharPref(k)});
      },
      getIntPref: async function(k){
        return await orDefault(k, async function(){return await pm.getIntPref(k)});
      },
      getBoolPref: async function(k){
        return await orDefault(k, async function(){return await pm.getBoolPref(k)});
      },
      setCharPref: async function(k,v){
        return await pm.setCharPref(k,v);
      },
      setIntPref: async function(k,v){
        return await pm.setIntPref(k,v)
      },
      setBoolPref: async function(k,v){
        return await pm.setBoolPref(k,v);
      },
      inc: async function(key, delta){
        logger.debug("increasing "+key);
        delta = delta || 1;
        var v = await ifce.getIntPref(key);
        v = (1 * (v||0)) + delta;
        var res = await pm.setIntPref(key,v);
        logger.debug("up to "+ v);
        return res;
      }
    };
    console.log("X");
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
  initializeData: async function(){
    var _this = this;
    var persistent_wrapper = new AutomaticDictionary.Lib.PersistentObject(
      this.ADDRESS_INFO_KEY,
      this.storage,
      {
        read:["get", "keys", "pairs", "size"],
        write:["set"],
        serializer: "toJSON",
        loader:"fromJSON",
        logger: this.logger
      },
      function(){
        return new AutomaticDictionary.Lib.LRUHashV2({}, {logger: _this.logger});
      }
    );
    this.data = persistent_wrapper;
    console.log(this.data);
  },
  initFreqSuffix: function(){
    //Build the object that will manage the storage for the object
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
    this.freq_suffix = persistent_wrapper;
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
  
  languageChanged: async function(){
    this.logger.debug("languageChanged call");
    
    if( !this.running ) return;
    this.logger.debug("languageChanged call and running");
    var current_lang = await this.getCurrentLang();
    var tos = await this.getRecipients();
    var ccs = await this.getRecipients("cc");
    this.logger.debug("tos are "+ tos.toString());
    this.logger.debug("ccss are "+ ccs.toString());
    var maxRecipients = await this.getMaxRecipients();
    if( tos.length + ccs.length > maxRecipients ){
      this.logger.warn("Discarded to save data. Too much recipients (maxRecipients is "+maxRecipients+").");
      this.changeLabel( "warn", this.ft("DiscardedUpdateTooMuchRecipients", [maxRecipients] ));
      this.last_lang_discarded = current_lang;
      return;
    }
    var toandcc_key = this.getKeyForRecipients({to: tos, cc: ccs});

    if (current_lang == this.last_lang && toandcc_key == this.last_toandcc_key){
      this.logger.debug('Same language and recipients as before '+current_lang);
      return;
    }
    this.last_lang_discarded = false;
    var stats = {saved_recipients:0, groups:0, individuals:0};
    if( tos.length > 0 ){
      this.logger.debug("Enter cond 1.x");
      //The user has set the language for the recipients
      //We update the assignment of language for those recipients
      //We overwrite it if it's alone but not if it has CCs
      await this.saveRecipientsToStructures({to:tos}, current_lang, stats, {force: tos.length > 1 || ccs.length == 0});
      if (tos.length > 1){
        for( var i in tos ){
          // Save the lang only if it has no lang setted!
          await this.saveRecipientsToStructures({to:[tos[i]]}, current_lang, stats);
        }
      }
    }
    // Save a lang for tos and ccs
    if( ccs.length > 0 ){
      this.logger.debug("Enter cond 2");
      await this.saveRecipientsToStructures({to:tos, cc:ccs}, current_lang, stats, {force:true});

      // Add recipients alone if they are undefined
      var curr = null;
      for( var i = 0; i< ccs.length; i++ ){
        await this.saveRecipientsToStructures({to:[ccs[i]]}, current_lang, stats);
      }
    }
    if( stats.saved_recipients > 0 ){
      if(this.deduce_language_retry){
        this.deduce_language_retry.stop();
        this.deduce_language_retry = null;
      }
      this.last_lang = current_lang;
      this.logger.debug("Enter cond 3");

      this.logger.debug("saved recipients are: " + stats.saved_recipients);
      this.changeLabel("info",
                       this.ft( "savedForRecipients",
                                [ current_lang, stats.saved_recipients ] )
                      );
    }
  },

  // @param recipients [Hash] with "to" and "cc" keys
  saveRecipientsToStructures: async function(recipients, lang, stats, options){
    options = options || {};
    var key = this.getKeyForRecipients(recipients);
    var is_single = !recipients.cc && recipients.to.length == 1;
    var force = options.force;
    var old = await this.data.get(key);

    if( this.isBlank(old) || force ){
      if( !this.isBlank(old) && is_single){
        this.remove_heuristic(key, old);
      }

      // Store it!
      this.data.set(key, lang);

      if( is_single ){
        this.save_heuristic(key, lang);
        stats.individuals++;
      }else{
        stats.groups++;
      }
      stats.saved_recipients++;
    }
  },

  getKeyForRecipients: function(recipients){
    var key = this.stringifyRecipientsGroup( recipients.to );
    if (recipients.cc){
      key += "[cc]" + this.stringifyRecipientsGroup( recipients.cc );
    }
    return key;
  },

  // True when the value is something we consider nonData
  isBlank: function( value ){
    return ((typeof value) == "undefined" || value === "" ||value === null);
  },

  inspect: function (values){
    return JSON.stringify(values);
  },
  
  save_heuristic: function(recipient, lang){
    this.logger.debug("saving heuristic for "+ recipient + " to "+ lang);
    var parts = recipient.split("@");
    if( parts[1] ){
      this.freq_suffix.add(parts[1], lang);
    }
    console.info("after adding heuristic:");
    console.info(this.freq_suffix.pairs());
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
  deduceLanguage: async function( opt ){
    var self = this;
    if(!opt) opt = {};

    if( ! (await this.canSpellCheck()) ){
      //TODO: notify user when spellcheck while you type is disabled.
      if( this.running && (!opt.count || opt.count < 10)){
        this.logger.info("Deferring deduceLanguage because spellchecker"+
                         " is not ready");
        opt.count = opt.count || 0;
        opt.count += 1;
        setTimeout(function(){ self.deduceLanguage(opt) },300);
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

    var recipients = await this.getRecipients();
    if( !this.running || recipients.length == 0 || this.last_lang_discarded ){
      // we stop deducing when last_lang_discarded because it means that
      // the user setted a language but we did not store because it was bigger
      // than MaxRecipients
      return;
    }
    var lang = null, method = this.METHODS.REMEMBER, i;
    // TO all and CC all
    var ccs = await this.getRecipients("cc");
    var toandcc_key = this.getKeyForRecipients({to: recipients, cc: ccs});
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
    
    if(!lang && await this.allowHeuristic()){
      this.logger.info("trying to get by heuristics");
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
      if( this.isBlank(lang) || (await this.getCurrentLang()) == lang){
        this.logger.debug("deduceLanguage detects that nothing changed or lang is null");
        return;
      }else{
        this.logger.debug("Detected changes on langs (from-to): "+ this.inspect([await this.getCurrentLang(), lang]));
      }
    }

    this.last_lang = lang;
    this.last_toandcc_key = toandcc_key;
    if(lang){
      try{
        this.setCurrentLang( lang );
        if( !nothing_changed ){
          this.changeLabel("info", this.ft("deducedLang."+method, [lang]))
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
          this.deduce_language_retry = setTimeout(function(){
            _this.logger.info("Relaunching deduceLanguage");
            _this.deduce_language_retry = null;
            _this.deduceLanguage({is_retry:true});
          }, this.deduce_language_retry_delay);
          return;
        }else{
          this.changeLabel("error", this.ft("errorSettingSpellLanguage", [lang] ));
          throw e;
        }
      }
      this.deduce_language_retries_counter = 0;
    }else{
      this.changeLabel("info", this.t( "noLangForRecipients" ));
    }
  },

  //Tries to guess by other recipients domains
  heuristic_guess: function(recipients){
    var recipient, parts, rightside, lang,
        freq_table = new AutomaticDictionary.Lib.FreqTable();
    console.log("freq suffix status");
    console.log(this.freq_suffix.pairs());
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
    //Temporary disable language change detection that we trigger ourself
    this.logger.info("setCurrentLang "+target);
    this.running = false;
    try{
      if( this.compose_window.changeLanguage ){
        this.logger.debug("calling compose_window.changeLanguage");
        this.compose_window.changeLanguage(target);
      }else{
        this.logger.error("No way to change language");
        this.changeLabel("error", this.t("errorNoWayToChangeLanguage") );
      }
    }finally{
      this.running = true;
    }
  },

  //Take care as this language is globally set.
  getCurrentLang: function(){
    if(this.compose_window.getCurrentLang){
      return this.compose_window.getCurrentLang();
    }
    return this.prefManager.getCharPref("spellchecker.dictionary");
  },

  canSpellCheck:function(){
    return this.compose_window.canSpellCheck();
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

  getStrBundle: function(){
    if(!this.string_bundle){
      this.string_bundle = new StringBundle("chrome://automatic_dictionary/locale/strings.properties");
    }
    return this.string_bundle;
  },

  //Translation (i18n) helper functions
  t: function( key ){
    console.log(["t", key]);
    return browser.i18n.getMessage(key);
  },

  ft: function(key, values){
    console.log(["ft", key, values]);
    return browser.i18n.getMessage(key, values);
  },

  //Log function
  log:function( msg ){
    this.logger.debug( msg );
  },
  
  getMaxRecipients: function(){
    return this.prefManager.getIntPref( this.pref_prefix + this.MAX_RECIPIENTS_KEY );
  },
  
  allowHeuristic: async function(){
    var value = await this.prefManager.getBoolPref(this.pref_prefix + this.ALLOW_HEURISTIC)
    console.log(["allowHeuristics", value]);
    return value;
  },
  
  notificationLevel: function(){
    return this.prefManager.get(this.pref_prefix + this.NOTIFICATION_LEVEL);
  },
  logLevel: function(){
    return this.prefManager.get(this.pref_prefix + this.LOG_LEVEL);
  },
  
  counterFor: async function(key){
    var ret = await this.prefManager.getIntPref(this.pref_prefix + "stats." + key);
    this.logger.debug("CunterFor "+key+ " is "+ret);
    return ret;
  },

  thunderbirdVersionGreaterOrEq:function(version){
    return Services.vc.compare(this.thunderbirdVersion, version) !== -1;
  },

  shutdown:function(){
    this.stop();
    this.logger.debug("Shutdown instance call");
    this.dispatchEvent({type:"shutdown"});
    this.compose_window.shutdown();
    //AutomaticDictionary.log_writer.close();
  },

  //It sets default values in case they are not setted
  setDefaults: async function(){
    var v;
    //set all default values
    for(var k in this.defaults){
      try{
        this.logger.debug("Value for "+k+ " is ");
        v = await this.prefManager.get_or_raise(k,this.defaults[k]);
        this.logger.debug(v);
      }catch(e){
        // a get on a non existing key raises an exception.
        v = null;
      }
      if(v === null || typeof(v) == 'undefined'){
        this.logger.debug("setting default for "+k);
        await this.prefManager.set(k,this.defaults[k]);
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
  }
};

AutomaticDictionary.extend( AutomaticDictionary.Class.prototype, AutomaticDictionary.EventDispatcher);
AutomaticDictionary.extend(AutomaticDictionary.Class.prototype, AutomaticDictionary.Migrations);

export { AutomaticDictionary };