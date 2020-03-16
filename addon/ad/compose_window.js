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
            console.log("Listener has received event. Language changed?!? param is following");
            console.log(param);
            _this.waitAnd(function(){ _this.ad.languageChanged(); });
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
        var lang = await browser.compose_ext.getCurrentLanguage(42)
        console.log(lang);
        this.logger.info("document attribute says current lang is "+lang);
        return lang;
    },

    recipients: async function( recipientType ){
      recipientType = recipientType || "to";
      var windows = await browser.windows.getAll({populate: true, windowTypes: ['messageCompose']});
      console.log(windows);
      var tabs = windows[0].tabs;
      console.log(tabs);
      var details = await browser.compose.getComposeDetails(tabs[0].id);
      console.log(details);
      var value = details[recipientType];
      if (typeof(value) == "string"){
        value = [value]
      }
      // TODO: normalize recipients to email alone.
      return value;
    },

    // TODO: maybe this has to go aside in another interface? with showLabel?
  showMessage: function( str, options ){
    this.logger.info("Sowing message: "+str);
    browser.compose_ext.showNotification(
      42,
      str,
      {
        logo_url: this.params.logo_url,
        buttons: options.buttons
      }
    );
  },

  changeLabel: function( str ){
    this.logger.info("Changing label to: "+str);
    browser.compose_ext.showNotification(
      42, //TODO
      str,
      {
        logo_url: this.params.logo_url,
        notification_time: this.params.notification_time
      }
    );
  },
  changeLanguage: function(lang){
    browser.compose_ext.setSpellCheckerLanguage(42, lang);
  }
});

//Register compose window
AutomaticDictionary.window_managers.push(AutomaticDictionary.ComposeWindow);

}