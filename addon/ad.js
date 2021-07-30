let AutomaticDictionary = {};

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
import * as persistent_object from './lib/persistent_object.js';
persistent_object.apply(AutomaticDictionary);
import * as pair_counter from './lib/pair_counter.js';
pair_counter.apply(AutomaticDictionary);
import * as freq_table from './lib/freq_table.js';
freq_table.apply(AutomaticDictionary);
import * as freq_suffix from './lib/freq_suffix.js';
freq_suffix.apply(AutomaticDictionary);
import { apply as apply_shutdownable } from './lib/shutdownable.js';
apply_shutdownable(AutomaticDictionary);
import * as logger from './lib/logger.js';
logger.apply(AutomaticDictionary);
import * as event_dispatcher from './lib/event_dispatcher.js';
event_dispatcher.apply(AutomaticDictionary);
import * as migrations from './ad/migrations.js';
migrations.apply(AutomaticDictionary);
import * as compose_window from './ad/compose_window.js';
compose_window.apply(AutomaticDictionary);
import * as compose_window_stub from './ad/compose_window_stub.js';
compose_window_stub.apply(AutomaticDictionary);

import { LanguageDeducer } from './ad/language_deducer.js';
import { LegacyPrefManager } from './lib/legacy_pref_manager.js';

AutomaticDictionary.logger = new AutomaticDictionary.Lib.Logger('warn', function(msg){
  console.info(msg);
});
AutomaticDictionary.logger.debug("Logger started");

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

AutomaticDictionary.Class = function(options, callback){
  // Parameters setup
  callback = callback || function(){};
  options = options || {};
  if( typeof(options.deduceOnLoad) == "undefined") options.deduceOnLoad = true;

  // Basic initialization
  AutomaticDictionary.instances.push(this);
  this.window = options.window;
  this.shutdown_chain = [];
  this.logger = new AutomaticDictionary.Lib.Logger(options.logLevel || 'debug', function(msg){
    console.info(msg);
  });
  this.logger.debug("ad: init");
  this.running = true;

  this.setupDependencies();

  var _this = this;
  this.migrate().then(function () {
    _this.setLogLevelFromConfig(options.logLevel);
    _this.prepareDataStructures();
    _this.prepareServices(options.compose_window_builder);
    _this.setShutdown();

    // Count the number of times it has been initialized.
    _this.storage.inc('stats.usages');

    _this.dispatchEvent({ type: "load" });

    // Set right language, for reply scenarios.
    if (options.deduceOnLoad) {
      setTimeout(function () { _this.deduceLanguage(); }, 1000);
    }
  }).then(() => callback(_this)).catch(console.error);
}

AutomaticDictionary.Class.prototype = {
  id: "automatic_dictionary_extension@jordi_beltran.net",
  //Constants
  ADDRESS_INFO_KEY:"addressesInfo",
  MAX_RECIPIENTS_KEY:"maxRecipients",
  ALLOW_HEURISTIC:"allowHeuristic",
  NOTIFICATION_LEVEL:"notificationLevel",
  LOG_LEVEL:"logLevel",

  FREQ_TABLE_KEY:"freqTableData",
  pref_prefix: "extensions.automatic_dictionary.",

  //Attributes
  initialized: false,
  running: false, //Stopped
  data: null,
  prefManager: null,
  last_toandcc_key: null,
  name: "AutomaticDictionary",
  notification_time_ms: 4000,

  logo_image: "logo.png",

  logger: AutomaticDictionary.logger,

  defaults: {
    "addressesInfo": "",
    "addressesInfo.maxSize": 1200,
    "migrations_applied": [],

    "maxRecipients": 10,
    "allowHeuristic": true,
    "freqTableData": "",

    "notificationLevel": 'info', // or "warn" or "error"
    "logLevel":"warn",
    "stats.usages": 0
  },

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
  getStorage: function(){
    var storage = browser.storage.local;
    var _this = this;
    var ifce = {
      set: async function(key, value){
        var data = {};
        data[key] = value;
        _this.logger.debug("Setting key: "+key);
        _this.logger.debug(value);
        return storage.set(data).catch(error => {
          _this.logger.error(error);
        });
      },
      get: async function(key){
        var data = await storage.get(key);
        return data[key];
      },
      inc: async function(key, delta){
        _this.logger.debug("increasing "+key);
        delta = delta || 1;
        var res = await ifce.set(key, (1 * await ifce.get(key)) + delta);
        _this.logger.debug("up to "+ await ifce.get(key));
        return res;
      }
    };
    return ifce;
  },
  initializeData: async function(){
    if(this.data) return;
    var _this = this;
    var persistent_wrapper = new AutomaticDictionary.Lib.PersistentObject(
      this.ADDRESS_INFO_KEY,
      this.storage,
      {
        read:["get", "keys", "pairs", "size","setExpirationCallback"],
        write:["set"],
        serializer: "toJSON",
        loader:"fromJSON",
        logger: this.logger
      },
      async function(){
        return new AutomaticDictionary.Lib.LRUHashV2({}, {
          logger: _this.logger,
          size: await _this.storage.get('addressesInfo.maxSize')
        });
      }
    );
    this.data = persistent_wrapper;
  },
  initFreqSuffix: function(){
    if (this.freq_suffix) return;
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
    this.data.setExpirationCallback(function(pair){
      if (_this.keyIsSingle(pair[0])){
        _this.remove_heuristic(pair[0],pair[1]);
      }
    });
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
      await this.changeLabel( "warn", this.ft("DiscardedUpdateTooMuchRecipients", [maxRecipients] ));
      this.last_lang_discarded = current_lang;
      return;
    }
    var context = this.deducer.buildContext();
    if (current_lang == this.last_lang && !this.contextChangedSinceLast(context)){
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
      if(this.deferredDeduceLanguage){
        this.deferredDeduceLanguage.stop();
        this.deferredDeduceLanguage = null;
      }
      this.last_lang = current_lang;
      this.logger.debug("Enter cond 3");

      this.logger.debug("saved recipients are: " + stats.saved_recipients);
      await this.changeLabel("info",
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
        await this.remove_heuristic(key, old);
      }

      // Store it!
      await this.data.set(key, lang);

      if( is_single ){
        await this.save_heuristic(key, lang);
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

  // True when the key represents a single email
  keyIsSingle: function(key){
    let parts = key.split('[cc]');
    let tos_size = parts[0].split(',').length;
    let ccs_empty = parts.length == 1 || parts[1] == ""

    if(tos_size == 1 && ccs_empty){
      return true;
    }
    return false;
  },

  // True when the value is something we consider nonData
  isBlank: function( value ){
    return ((typeof value) == "undefined" || value === "" ||value === null);
  },

  inspect: function (values){
    return JSON.stringify(values);
  },

  save_heuristic: async function(recipient, lang){
    this.logger.debug("saving heuristic for "+ recipient + " to "+ lang);
    var parts = recipient.split("@");
    if( parts[1] ){
      await this.freq_suffix.add(parts[1], lang);
    }
    await this.freq_suffix.pairs();
  },

  remove_heuristic: async function(recipient, lang){
    this.logger.debug("removing heuristic for "+ recipient + " to "+ lang);
    var parts = recipient.split("@");
    if( parts[1] ){
      await this.freq_suffix.remove(parts[1], lang);
    }
  },
  // Updates the interface with the lang deduced from the recipients
  deduceLanguage: async function( opt ){
    if(!opt) opt = {};

    if( !(await this.canSpellCheck()) ){
      this.deferDeduceLanguage(opt);
      return;
    }

    if( this.deferredDeduceLanguage ){
      this.logger.info("Cancelled a deduceLanguage call as there is a retry waiting...");
      // There is a retry queued. Stay quiet and wait for it.
      return;
    }

    var recipients = await this.getRecipients();
    if( !this.running || recipients.length == 0 || this.last_lang_discarded ){
      // we stop deducing when last_lang_discarded because it means that
      // the user setted a language but we did not store because it was bigger
      // than MaxRecipients
      if(this.last_lang_discarded){
        this.logger.debug("Last lang discarded for too much recipients")
      }
      this.dispatchEvent({type:"deduction-completed"});
      return;
    }
    var lang = null, method;
    // TO all and CC all
    var ccs = await this.getRecipients("cc");
    var toandcc_key = this.getKeyForRecipients({to: recipients, cc: ccs});

    var deduction = await this.deducer.deduce();

    lang = (deduction && deduction.language) || null;
    method = (deduction && deduction.method) || null;
    this.logger.debug("Language found: "+ lang);

    if(!this.contextChangedSinceLast(deduction)){
      if((await this.getCurrentLang()) == lang){
        this.logger.debug("deduceLanguage detects that nothing changed");
        this.dispatchEvent({type:"deduction-completed"});
        return;
      }else{
        this.logger.debug("Detected changes on langs (from-to): "+ this.inspect([await this.getCurrentLang(), lang]));
      }
    }

    if(!this.isBlank(lang)){
      try{
        await this.setCurrentLang( lang );
        if( this.contextChangedSinceLast(deduction) ){
          await this.changeLabel("info", this.ft("deducedLang."+method, [lang]))
        }
      }catch( e ){
        AutomaticDictionary.logException(e);
        this.logger.error("Exception message on deduceLanguage is: "+ e.toString());
        return this.deferDeduceLanguage(opt);
      }
    }else{
      await this.changeLabel("info", this.t( "noLangForRecipients" ));
    }
    this.last_lang = lang;
    this.lastDeduction = deduction;
    this.dispatchEvent({type:"deduction-completed"});
  },

  contextChangedSinceLast(deduction){
    if(!this.lastDeduction) return true;

    const last_key = this.getKeyForRecipients(this.lastDeduction.recipients);
    return last_key != this.getKeyForRecipients(deduction.recipients);
  },

  deferDeduceLanguage: function(opt){
    if( this.running ){
      this.logger.info("Deferring deduceLanguage");
      opt.count = opt.count || 0;
      opt.count += 1;
      const self = this;
      if(opt.count < 10) {
        self.deferredDeduceLanguage = setTimeout(function(){
          self.deferredDeduceLanguage = null;
          self.deduceLanguage(opt);
        },300);
      }else{
        this.logger.warn("Stopped retrying deduceLanugage after 10 attempts")
        this.dispatchEvent({type:"deduction-failed"});
      }
    }else{
      this.logger.warn("Addon is not running so it won't retry deduceLanguage");
    }
  },

  //Tries to guess by other recipients domains
  heuristic_guess: async function(recipients){
    var recipient, parts, rightside, lang,
        freq_table = new AutomaticDictionary.Lib.FreqTable();
    for(var i=0; i < recipients.length; i++){
      recipient = recipients[i];
      parts = recipient.split("@");
      rightside = parts[parts.length-1];
      this.logger.debug("Looking for heuristic for "+rightside);
      lang = await this.freq_suffix.get(rightside,true);
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

  setCurrentLang: async function( target ){
    //Temporary disable language change detection that we trigger ourself
    this.logger.info("setCurrentLang "+target);
    this.running = false;
    try{
      await this.compose_window.changeLanguage(target);
    }finally{
      this.running = true;
    }
  },

  setupDependencies: function(){
    this.prefManager = LegacyPrefManager(browser, this.defaults, this.logger, this.pref_prefix);
    this.storage = this.getStorage();
  },

  prepareDataStructures: function(){
    if(AutomaticDictionary.instances[AutomaticDictionary.instances.length - 1]){
      // Singleton on data structures
      var instance = AutomaticDictionary.instances[0]
      this.data = instance.data;
      this.freq_suffix = instance.freq_suffix;
    }
    this.logger.info("before initialize data");
    this.initializeData();
    this.initialized = true;
    this.initFreqSuffix();
  },

  prepareServices: function(compose_window_builder){
    var cw_builder = compose_window_builder;
    this.compose_window = new cw_builder(
      {
        ad: this,
        name: this.name,
        logo_url: browser.runtime.getURL(this.logo_image),
        notification_time: this.notification_time_ms,
        logger: this.logger,
        window: window
      }
    );
    this.setListeners();
    this.deducer = new LanguageDeducer(this);
  },

  setLogLevelFromConfig: function(optionsLogLevel){
    var _this = this;
    this.logLevel().then(function (configurationLogLevel) {
      const level = optionsLogLevel || configurationLogLevel;
      AutomaticDictionary.logger.setLevel(level);
      _this.logger.setLevel(level);
    });
  },

  //Take care as this language is globally set.
  getCurrentLang: function(){
    return this.compose_window.getCurrentLang();
  },

  canSpellCheck:async function(){
    return this.compose_window && await this.compose_window.canSpellCheck();
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

  changeLabel: async function(level, str){
    var arr = ["info","warn","error"];
    // level is equal or higher than configured level
    if( arr.indexOf(level) >= arr.indexOf(await this.notificationLevel()) ){
      return this.compose_window.changeLabel( str );
    }else{
      this.logger.debug('notification level too high for: '+str)
    }
  },

  //Translation (i18n) helper functions
  t: function( key ){
    return browser.i18n.getMessage(key);
  },

  ft: function(key, values){
    return browser.i18n.getMessage(key, values);
  },

  getMaxRecipients: function(){
    return this.storage.get( this.MAX_RECIPIENTS_KEY );
  },

  allowHeuristic: async function(){
    var value = await this.storage.get(this.ALLOW_HEURISTIC)
    return value;
  },

  notificationLevel: function(){
    return this.storage.get(this.NOTIFICATION_LEVEL);
  },
  logLevel: function(){
    return this.storage.get(this.LOG_LEVEL);
  },

  setShutdown: function(){
    var _this = this;
    // Shutdown the addon instance when window is removed.
    if (this.window) {
      browser.windows.onRemoved.addListener(function (windowId) {
        if (_this.window.id != windowId) {
          _this.logger.debug("Not this window closed");
          return;
        }
        _this.logger.debug("Shutting down ad on this window");
        _this.shutdown();
      });
    }
    this.shutdown_chain.push(function(){
      _this.stop();
      _this.logger.debug("Shutdown instance call");
      _this.dispatchEvent({type:"shutdown"});
    });
  },

  //It sets default values in case they are not setted
  setDefaults: async function(){
    var v;
    //set all default values
    for(var k in this.defaults){
      try{
        this.logger.debug("Value for "+k+ " is ");
        v = await this.storage.get(k);
        this.logger.debug(v);
      }catch(e){
        this.logger.warn(e)
        // a get on a non existing key raises an exception.
        v = null;
      }
      if(v === null || typeof(v) == 'undefined'){
        this.logger.debug("setting default for "+k);
        await this.storage.set(k,this.defaults[k]);
      }
    }
  }
};

Object.assign(AutomaticDictionary.Class.prototype,
                           AutomaticDictionary.EventDispatcher);

Object.assign(AutomaticDictionary.Class.prototype,
                           AutomaticDictionary.Migrations);

Object.assign(AutomaticDictionary.Class.prototype,
                           AutomaticDictionary.Lib.Shutdownable);


export { AutomaticDictionary };