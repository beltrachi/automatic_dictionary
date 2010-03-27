/** 
 Issues:
  * [CRITICAL] When opening a window it allways sets the current dict as the
    default for the recipients (found replying to mails)
  * Not support for multiple compose windows open (its a JS singleton)
    * Concurrency issues accessing the saved preferences
 TODO:
  - Detect when a recipient has been added
  - Fetch if this address has a defined language
  - Change the language of the spellchecker to the saved one
*/
//Only load if its not already loaded.
automatic_dictionary = {
  
  //Constants
  ADDRESS_INFO_PREF:"extensions.automatic_dictionary.addressesInfo",
  POLLING_DELAY: 3000, //Miliseconds
  
  //Attributes
  user_overriden_lang: false,
  last_language_set: null,
  initialized: false,
  running: false, //Stopped
  data: {},
  last_timeout: null, //Timer object of the next poll
  
  init: function(){
    this.log("ad: init");
    this.running = true;
    if( !this.initalized ){
        this.prefManager = Components.classes["@mozilla.org/preferences-service;1"]
                                    .getService(Components.interfaces.nsIPrefBranch);
        this.iter = 0; //ObserveRecipients execution counter
        setTimeout( "automatic_dictionary.loadData(true);",10 ); //Deferred
        this.initialized = true;
    }else{
        //already initialized
        this.observeRecipients();
    }
    this.setListeners();
  },
  
  stop: function(){
    this.log("ad: stop");
    this.running = false;
    if( this.last_timeout ) window.clearTimeout( this.last_timeout );
    this.last_timeout = null;
  },
  
  loadData: function( initPolling ){
    var value = this.prefManager.getCharPref( this.ADDRESS_INFO_PREF );
    try{
        if( !value ){
            value = "{}";
        }
        eval("automatic_dictionary.data = ("+ value + ")");
    }catch( e ){
      //TODO: what??
      this.log(e.toString()); //FIXME
      throw e;
    }
    //After data loaded, observe the adresses list to update lang if required
    if( initPolling ) this.observeRecipients();
  },
  
  saveData: function(){
    var value = "{}";
    if( this.data && this.data.toSource ){
      value = this.data.toSource();
    }else{
      //TODO: something happened!! what to do?
      this.log(this.data);
    }
    this.prefManager.setCharPref( this.ADDRESS_INFO_PREF, value );
  },
  
  observeRecipients: function(){
    this.log("ad: observeRecipients");
    if( !this.running ) return;
    this.log("ad: observeRecipients - running");
    this.iter++;
    try{
      this.detectUserOverridenLanguage();
      this.deduceLanguage();
      //Queue next call
      if( this.running )
          this.last_timeout = setTimeout("automatic_dictionary.observeRecipients();", this.POLLING_DELAY );
    }catch(e){
      this.changeLabel( e.toString());
    }
  },
  
  detectUserOverridenLanguage: function(){
    var prefService = Components.classes["@mozilla.org/preferences-service;1"]
                              .getService(Components.interfaces.nsIPrefService);
    var sPrefs = prefService.getBranch(null);
    var current_lang = sPrefs.getComplexValue("spellchecker.dictionary", nsISupportsString).data; 
    
    var arr = this.getRecipients();
    if( arr.length > 0 && current_lang != this.last_language_set ){
      //The user has set the language for the recipients
      //We update the assignment of language for those recipients
      for( var i in arr){
        this.data[arr[i]] = current_lang;
      }
      this.saveData();
      this.user_overriden_lang = true;
      this.last_language_set = current_lang;
      this.changeLabel( " Saved " + current_lang + " as default for " + arr.length + " recipients" );
    }
    //When user removes recipients, language detection starts again
    if(arr.length == 0){
      this.user_overriden_lang = false;
    }
  },
  
  deduceLanguage: function(){
    if(this.user_overriden_lang) return;
    var recipients = this.getRecipients();
    this.log("Deducing language for: " + recipients.toSource());
    var target_lang = null;
    for( var idx in recipients ){
      var lang = this.getLangFor( recipients[idx] );
      if( lang ){ 
        target_lang = lang;
        break;
      }
    }
    if(target_lang){
      var worked = false;
      try{
        this.setCurrentLang( target_lang );
        worked = true;
      }catch( e ){
        this.changeLabel( "Error: Could not set lang to "+ target_lang+ ". Maybe its not installed any more?" );
      }
      if(worked) this.changeLabel( "Deduced " + target_lang );
    }
  },
  
  setCurrentLang: function( target ){
    var fake_event = { target: {value: target},stopPropagation: function(){} };
    ChangeLanguage( fake_event );
    this.last_language_set = target;
  },
  
  getLangFor: function( addr ){
    return this.data[addr];
  },
  
  getRecipients: function(){
    var fields = Components.classes["@mozilla.org/messengercompose/composefields;1"].createInstance(Components.interfaces.nsIMsgCompFields);
    Recipients2CompFields( fields );
    var nsIMsgRecipientArrayInstance = {length:0};
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
      //var w = document.getElementById("msgcomposeWindow");
      //this.log( " w is " + w.toSource());
      if( window ){
          window.addEventListener("compose-window-close", function(){automatic_dictionary.stop()}, true);
          this.log("event seem to be registered");
      }else{
          this.changeLabel("Internal error (Init. listeners)");
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
  
  log:function( msg ){
      window.dump( "automatic_dictionary: " + msg + "\n");
  }
}
automatic_dictionary.init();

