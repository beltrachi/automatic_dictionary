let AutomaticDictionary = {};

//Window managers are objects that attach to the windows that have the compose
//window to compose mails
AutomaticDictionary.window_managers = [];

import * as lib from './lib.js';
lib.apply(AutomaticDictionary);

import { Shutdownable } from './lib/shutdownable.js';
import { Logger } from './lib/logger.js';

import { EventDispatcher } from './lib/event_dispatcher.js';

import * as migrations from './ad/migrations.js';
migrations.apply(AutomaticDictionary);

import { ComposeWindow } from './ad/compose_window.js';
//Register compose window
AutomaticDictionary.window_managers.push(ComposeWindow);

import { LanguageDeducer } from './ad/language_deducer.js';
import { DomainHeuristic } from './lib/domain_heuristic.js';
import { LanguageAssigner } from './ad/language_assigner.js';

AutomaticDictionary.logger = new Logger('warn', function (msg) {
  console.info(msg);
});
AutomaticDictionary.logger.debug("Logger started");

AutomaticDictionary.logException = function (e) {
  AutomaticDictionary.logger.error(e);
};

//Shuts down all instances
AutomaticDictionary.shutdown = function () {
  this.logger.debug("Shutdown class call");
  var list = AutomaticDictionary.instances;
  for (var x = 0; x < list.length; x++) {
    try {
      list[x].shutdown();
    } catch (e) {
      this.logException(e);
    }
  }
  AutomaticDictionary.instances = [];
};

//To unload observers
AutomaticDictionary.instances = [];

AutomaticDictionary.Class = function (options, callback) {
  // Parameters setup
  callback = callback || function () { };
  options = options || {};
  if (typeof (options.deduceOnLoad) == "undefined") options.deduceOnLoad = true;

  // Basic initialization
  this.window = options.window;
  this.shutdown_chain = [];
  this.logger = new Logger(options.logLevel || 'debug', function (msg) {
    console.info(msg);
  });
  this.logger.debug("ad: init");
  this.running = true;
  this.ignored_contexts = [];
  this.last_langs = [];
  this.setupDependencies();

  var _this = this;
  this.initTime = this.currentTimestamp();
  this.migrate().then(function () {
    _this.setLogLevelFromConfig(options.logLevel);
    _this.prepareDataStructures();
    _this.prepareServices(options.compose_window_builder);
    _this.setShutdown();
    AutomaticDictionary.instances.push(_this);
    // Count the number of times it has been initialized.
    _this.storage.inc('stats.usages');
    _this.dispatchEvent({ type: "load" });

    // When replying, set the right language
    if (options.deduceOnLoad) {
      setTimeout(function () { _this.deduceLanguage(); }, 1000);
    }
  }).then(() => callback(_this)).catch(console.error);
}

AutomaticDictionary.Class.prototype = {
  id: "automatic_dictionary_extension@jordi_beltran.net",
  //Constants
  ADDRESS_INFO_KEY: "addressesInfo",
  MAX_RECIPIENTS_KEY: "maxRecipients",
  ALLOW_HEURISTIC: "allowHeuristic",
  NOTIFICATION_LEVEL: "notificationLevel",
  LOG_LEVEL: "logLevel",

  FREQ_TABLE_KEY: "freqTableData",

  //Attributes
  initialized: false,
  running: false, //Stopped
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
    "logLevel":"debug",
    "stats.usages": 0
  },

  stop: function () {
    if (!this.running) return; //Already stopped
    this.logger.debug("ad: stop");
    this.running = false;
  },

  start: function () {
    if (this.running) return; //Already started
    this.logger.debug("ad: start");
    this.running = true;
  },
  getStorage: function () {
    var storage = browser.storage.local;
    var _this = this;
    var ifce = {
      set: async function (key, value) {
        var data = {};
        data[key] = value;
        _this.logger.debug("Setting key: " + key);
        _this.logger.debug(value);
        return storage.set(data).catch(error => {
          _this.logger.error(error);
        });
      },
      get: async function (key) {
        var data = await storage.get(key);
        return data[key];
      },
      inc: async function (key, delta) {
        _this.logger.debug("increasing " + key);
        delta = delta || 1;
        var res = await ifce.set(key, (1 * await ifce.get(key)) + delta);
        _this.logger.debug("up to " + await ifce.get(key));
        return res;
      }
    };
    return ifce;
  },

  // Called when the user changes the language of the dictionary
  languageChanged: async function () {
    this.logger.debug("languageChanged call");

    if (!this.running) return;
    if(this.initTime + 1500 > this.currentTimestamp()){
      this.logger.debug('Window has just initialized, ignoring dictionary changes because its not a human who did them.')
      return;
    }
    this.logger.debug("languageChanged call and running");
    var maxRecipients = await this.getMaxRecipients();
    var stats = { saved_recipients: 0 };

    var context = await this.deducer.buildContext();

    if (this.tooManyRecipients(context, maxRecipients)) {
      this.logger.warn("Discarded to save data. Too many recipients (maxRecipients is " + maxRecipients + ").");
      await this.changeLabel("warn", this.ft("DiscardedUpdateTooManyRecipients", [maxRecipients]));
      this.ignored_contexts.push(context)
      return;
    }
    this.ignored_contexts = [];

    if (this.equalLanguages(context.languages, this.last_langs) && !this.contextChangedSinceLast(context)) {
      this.logger.debug('Same languages and recipients as before ' + context.languages);
      return;
    }

    this.logger.debug("Lang: " + context.languages + " last_lang: " + this.last_langs);
    await this.languageAssigner.languageChanged(context, stats);

    if (stats.saved_recipients > 0) {
      this.stopDeferredDeduceLanguage();
      this.last_langs = context.languages;

      this.logger.debug("saved recipients are: " + stats.saved_recipients);
      await this.changeLabel("info",
        this.ft("savedForRecipients",
          [context.languages, stats.saved_recipients])
      );
    }
  },

  tooManyRecipients: function (context, maxRecipients) {
    return context.recipients.to.length + context.recipients.cc.length > maxRecipients;
  },

  stopDeferredDeduceLanguage: function(){
    if (this.deferredDeduceLanguage) {
      this.deferredDeduceLanguage.stop();
      this.deferredDeduceLanguage = null;
    }
  },

  // Updates the interface with the lang deduced from the recipients
  deduceLanguage: async function (opt) {
    if (!opt) opt = {};

    if (!(await this.canSpellCheck())) {
      this.deferDeduceLanguage(opt);
      return;
    }

    if (this.deferredDeduceLanguage) {
      this.logger.info("Cancelled a deduceLanguage call as there is a retry waiting...");
      // There is a retry queued. Stay quiet and wait for it.
      return;
    }
    var _this = this;
    await this.withLock('deduceLanguage', async function(){
      await _this.deduceLanguageInternal(opt);
    })
  },

  // Updates the interface with the lang deduced from the recipients
  deduceLanguageInternal: async function (opt) {
    const recipients = await this.getRecipients();
    const is_ignored_context = this.isIgnoredContext(this.deducer.buildContext());
    if (!this.running || recipients.length == 0 || is_ignored_context) {
      // we stop deducing when context is ignored because it means that
      // the user setted a language but we did not store because it was bigger
      // than MaxRecipients
      if (is_ignored_context) {
        this.logger.debug("Last lang discarded for too many recipients")
      }
      this.dispatchEvent({ type: "deduction-completed" });
      return;
    }
    const deduction = await this.deducer.deduce();

    const langs = (deduction && deduction.languages) || [];
    const method = (deduction && deduction.method) || null;
    this.logger.debug("Language found: " + langs);

    if (!this.contextChangedSinceLast(deduction)) {
      const currentLangs = await this.getCurrentLangs();
      if (this.equalLanguages(currentLangs,langs)) {
        this.logger.debug("deduceLanguage detects that nothing changed");
        this.dispatchEvent({ type: "deduction-completed" });
        return;
      } else {
        this.logger.debug("Detected changes on langs (from-to): " +
          JSON.stringify([currentLangs, langs]));
      }
    }
    this.logger.debug('Lang in deduceLanguage is '+ langs)

    if (langs && langs.length > 0) {
      try {
        await this.setCurrentLangs(langs);
        if (this.contextChangedSinceLast(deduction)) {
          await this.changeLabel("info", this.ft("deducedLang." + method, [langs]))
        }
      } catch (e) {
        AutomaticDictionary.logException(e);
        this.logger.error("Exception message on deduceLanguage is: " + e.toString());
        return this.deferDeduceLanguage(opt);
      }
    } else {
      await this.changeLabel("info", this.t("noLangForRecipients"));
    }
    this.last_langs = langs;
    this.lastDeduction = deduction;
    this.dispatchEvent({ type: "deduction-completed" });
  },

  withLock: async function(lock_name, fn){
    this.locks = this.locks || [];
    if (this.locks[lock_name] == 1){
      this.logger.debug('Lock blocks execution of '+lock_name);
      return;
    }
    try {
      this.locks[lock_name] = 1
      await fn()
    }finally{
      this.locks[lock_name] = 0
    }
  },

  isIgnoredContext: function(context){
    for(const ignored_context of this.ignored_contexts) {
      if(context.recipients.getKey() == ignored_context.recipients.getKey()){
        return true;
      }
    }
    return false;
  },

  contextChangedSinceLast: function (deduction) {
    if (!this.lastDeduction) return true;

    const last_key = this.lastDeduction.recipients.getKey();
    return last_key != deduction.recipients.getKey();
  },

  deferDeduceLanguage: function (opt) {
    if (this.running) {
      this.logger.info("Deferring deduceLanguage");
      opt.count = opt.count || 0;
      opt.count += 1;
      const self = this;
      if (opt.count < 10) {
        self.deferredDeduceLanguage = setTimeout(function () {
          self.deferredDeduceLanguage = null;
          self.deduceLanguage(opt);
        }, 300);
      } else {
        this.logger.warn("Stopped retrying deduceLanugage after 10 attempts")
        this.dispatchEvent({ type: "deduction-failed" });
      }
    } else {
      this.logger.warn("Addon is not running so it won't retry deduceLanguage");
    }
  },

  //Tries to guess by other recipients domains
  heuristicGuess: async function (recipients) {
    return await this.domainHeuristic.heuristicGuess(recipients);
  },

  setCurrentLangs: async function (targets) {
    //Temporary disable language change detection that we trigger ourself
    this.logger.info("setCurrentLangs " + targets);
    this.running = false;
    try {
      await this.compose_window.changeLanguages(targets);
    } finally {
      this.running = true;
    }
  },

  setupDependencies: function () {
    this.storage = this.getStorage();
  },

  prepareDataStructures: function () {
    if (AutomaticDictionary.instances[0]) {
      // Singleton on data structures
      this.logger.debug('reusing data structures')
      var instance = AutomaticDictionary.instances[0]
      this.languageAssigner = instance.languageAssigner;
      this.domainHeuristic = instance.domainHeuristic;
    } else {
      this.logger.info("Initializing data");
      this.languageAssigner = new LanguageAssigner(this.logger, this.storage)
      this.domainHeuristic = new DomainHeuristic(
        this.storage,
        this.logger,
        this.FREQ_TABLE_KEY,
        this.languageAssigner)
    }
    this.initialized = true;
  },

  prepareServices: function (compose_window_builder) {
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

  setLogLevelFromConfig: function (optionsLogLevel) {
    var _this = this;
    this.logLevel().then(function (configurationLogLevel) {
      const level = optionsLogLevel || configurationLogLevel;
      AutomaticDictionary.logger.setLevel(level);
      _this.logger.setLevel(level);
    });
  },

  getCurrentLangs: async function () {
    const langs = await this.compose_window.getCurrentLangs();
    return langs.slice().sort();
  },

  canSpellCheck: async function () {
    return this.compose_window && await this.compose_window.canSpellCheck();
  },

  getLangsFor: function (addr) {
    return this.languageAssigner.getLangsFor(addr)
  },

  getRecipients: function (recipientType) {
    return this.compose_window.recipients(recipientType);
  },

  setListeners: function () {
    return this.compose_window.setListeners();
  },

  changeLabel: async function (level, str) {
    var arr = ["info", "warn", "error"];
    // level is equal or higher than configured level
    if (arr.indexOf(level) >= arr.indexOf(await this.notificationLevel())) {
      return this.compose_window.changeLabel(str);
    } else {
      this.logger.debug('notification level too high for: ' + str)
    }
  },

  //Translation (i18n) helper functions
  t: function (key) {
    return browser.i18n.getMessage(key);
  },

  ft: function (key, values) {
    return browser.i18n.getMessage(key, values);
  },

  getMaxRecipients: function () {
    return this.storage.get(this.MAX_RECIPIENTS_KEY);
  },

  allowHeuristic: async function () {
    var value = await this.storage.get(this.ALLOW_HEURISTIC)
    return value;
  },

  notificationLevel: function () {
    return this.storage.get(this.NOTIFICATION_LEVEL);
  },
  logLevel: function () {
    return this.storage.get(this.LOG_LEVEL);
  },

  setShutdown: function () {
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
    this.shutdown_chain.push(function () {
      _this.stop();
      _this.logger.debug("Shutdown instance call");
      _this.dispatchEvent({ type: "shutdown" });
    });
  },

  //It sets default values in case they are not setted
  setDefaults: async function () {
    var v;
    //set all default values
    for (var k in this.defaults) {
      try {
        this.logger.debug("Value for " + k + " is ");
        v = await this.storage.get(k);
        this.logger.debug(v);
      } catch (e) {
        this.logger.warn(e)
        // a get on a non existing key raises an exception.
        v = null;
      }
      if (v === null || typeof (v) == 'undefined') {
        this.logger.debug("setting default for " + k);
        await this.storage.set(k, this.defaults[k]);
      }
    }
  },

  currentTimestamp: function(){
    return Date.now();
  },
  equalLanguages: function(list1, list2){
    // Using slice() to clone lists.
    return JSON.stringify(list1.slice().sort()) == JSON.stringify(list2.slice().sort())
  }
};

Object.assign(AutomaticDictionary.Class.prototype,
  EventDispatcher);

Object.assign(AutomaticDictionary.Class.prototype,
  AutomaticDictionary.Migrations);

Object.assign(AutomaticDictionary.Class.prototype,
  Shutdownable);

export { AutomaticDictionary };