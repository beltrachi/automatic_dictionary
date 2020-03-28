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
      this.addListener(browser.compose_ext.onLanguageChange,async function (tabId, language){
        try{
          if (tabId != await _this.getTabId()) {
            _this.logger.debug("Ignoring tab id, mine is "+ (await _this.getTabId()));
            return;
          }
          _this.ad.languageChanged();
        }catch(e){
          _this.logger.error(e);
        }
      });
      this.addListener(browser.compose_ext.onRecipientsChange, async function (tabId){
        if (tabId != await _this.getTabId()) {
          _this.logger.debug("Ignoring tab id, mine is "+ (await _this.getTabId()));
          return;
        }
        _this.waitAnd(function(){
          _this.ad.deduceLanguage();
        });
      });

      this.addListener(browser.windows.onFocusChanged, function(windowId) {
        if (_this.window.id != windowId){
          _this.logger.debug("Ignoring onFocusChanged because different windowId");
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
      this.ad.addEventListener('shutdown', function(){
        _this.logger.debug("shutting down compose window");
        _this.shutdown();
      });
    },

    prepareWindow:function(window){
        // No need to create items because composewindow already has a
        // notification box
    },

  getCurrentLang: async function(){
    // TODO: use tab id!
    var lang = await browser.compose_ext.getCurrentLanguage(await this.getTabId());
    this.logger.debug("Current lang is "+lang);
    return lang;
  },

  getTabId: async function(){
    if (this.tabId) return this.tabId
    var window = await browser.windows.get(this.window.id, {populate: true});
    this.tabId = window.tabs[0].id;
    return this.tabId;
  },

  recipients: async function( recipientType ){
    recipientType = recipientType || "to";
    var tabId = await this.getTabId();
    var details = await browser.compose.getComposeDetails(tabId);
    var recipients = details[recipientType];
    if (typeof(recipients) == "string"){
      // Cast to array
      recipients = [recipients]
    }
    // Array of String or ComposeRecipients
    if(typeof(recipients[0]) == "string"){
      // Normalize recipients only when its raw string.
      recipients = this.normalizeRecipients(recipients);
    }else{
      // ComposeRecipients
      recipients = await this.getEmailFromRecipients(recipients);
    }
    return recipients;
  },

  // Remove everything but the email because its the canonical part.
  normalizeRecipients: function(list){
    var out = [];
    for(var i = 0, size = list.length; i < size ; i++){
      var item = list[i];
      try{
        out.push(this.extractEmails(item)[0]);
      }catch(e){
        // Normalization could not find an email, lets use it as is.
        out.push(item);
      }
    }
    return out;
  },
  extractEmails: function ( text ){
    return text.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/gi);
  },

  getEmailFromRecipients: async function(recipients) {
    var out = [];
    for(var i = 0, size = recipients.length; i < size ; i++){
      var recipient = recipients[i];
      switch(recipient.type){
      case "contact":
        var contact = await browser.contacts.get(recipient.id);
        out.push(contact.properties.PrimaryEmail);
        break;
      case "mailingList":
        var list = await browser.mailingLists.get(recipient.id);
        // Mailing list does not have an email so we try to get its name.
        out.push(list.properties.name);
        break;
      }
    }
    return out;
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