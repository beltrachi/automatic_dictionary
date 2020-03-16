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
export function apply(AutomaticDictionary){
AutomaticDictionary.ComposeWindow = (function( params ){
    this.ad = params.ad;
    this.params = params;
    this.shutdown_chain = [];
    this.logger = params.logger;
  this.window = this.ad.window;
});

AutomaticDictionary.ComposeWindow.canManageWindow = function(window){
    //We can manage the messengercompose window.
    regex = /chrome.*messengercompose\.(xul|xhtml)/
    return regex.test(window.document.location);
};

AutomaticDictionary.extend(
    AutomaticDictionary.ComposeWindow.prototype,
    AutomaticDictionary.Lib.Shutdownable);

AutomaticDictionary.extend( AutomaticDictionary.ComposeWindow.prototype, {

    name: "ComposeWindow",
    logger: null,

    waitAnd:function(fn){
        setTimeout(fn,800);
    },

    setListeners:function(){
        var _this = this;
        //capture language change event
      browser.compose_ext.onLanguageChange.addListener(function (param){
        try{
            console.log("onLanguageChange param is following");
          console.log(param);
          _this.ad.languageChanged();
        }catch(e){
          console.error(e);
        }
        });
        browser.compose_ext.onRecipientsChange.addListener(function (tabId){
            console.log("Listener has received event. Recipients changed?!?");
            console.log(tabId);
            _this.waitAnd(function(){
                _this.ad.deduceLanguage();
            });
        });

        browser.windows.onFocusChanged.addListener(function(windowId) {
            console.log("Focus changed, window id is ", windowId);
            if (_this.window.id != windowId){
                return
            }

            _this.waitAnd(function(){
                _this.ad.deduceLanguage();
            });
        });

        window.automatic_dictionary_initialized = true;
        this.shutdown_chain.push(function(){
            window.automatic_dictionary_initialized = false;
        });
        this.logger.debug("events registered");
    },

    prepareWindow:function(window){
        // No need to create items because composewindow already has a
        // notification box
    },

  getCurrentLang: async function(){
    // TODO: use tab id!
    var lang = await browser.compose_ext.getCurrentLanguage(await this.getTabId());
    console.log(lang);
    this.logger.info("document attribute says current lang is "+lang);
    return lang;
  },

  getTabId: async function(){
    if (this.tabId) return this.tabId
    var window = await browser.windows.get(this.window.id, {populate: true});
    console.log(window);
    this.tabId = window.tabs[0].id;
    return this.tabId;
  },

    recipients: async function( recipientType ){
      recipientType = recipientType || "to";
      var tabId = await this.getTabId();
      var details = await browser.compose.getComposeDetails(tabId);
      console.log(details);
      var value = details[recipientType];
      if (typeof(value) == "string"){
        value = [value]
      }
      return this.normalizeRecipients(value);
    },

  // Remove everything but the email because its the canonical part.
  normalizeRecipients: function(list){
    var out = [];
    for(var i = 0, size = list.length; i < size ; i++){
      var item = list[i];
      out.push(this.extractEmails(item)[0]);
    }
    return out;
  },
  extractEmails: function ( text ){
    return text.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/gi);
  },
    // TODO: maybe this has to go aside in another interface? with showLabel?
  showMessage: async function( str, options ){
    this.logger.info("Sowing message: "+str);
    browser.compose_ext.showNotification(
      await this.getTabId(),
      str,
      {
        logo_url: this.params.logo_url,
        buttons: options.buttons
      }
    );
  },

  changeLabel: async function( str ){
    this.logger.info("Changing label to: "+str);
    browser.compose_ext.showNotification(
      await this.getTabId(),
      str,
      {
        logo_url: this.params.logo_url,
        notification_time: this.params.notification_time
      }
    );
  },
  changeLanguage: async function(lang){
    browser.compose_ext.setSpellCheckerLanguage(await this.getTabId(), lang);
  },
  canSpellCheck: async function(){
    return await browser.compose_ext.canSpellCheck(await this.getTabId());
  }
});

//Register compose window
AutomaticDictionary.window_managers.push(AutomaticDictionary.ComposeWindow);

}