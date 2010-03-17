/** 
 TODO:
  - Detect when a recipient has been added
  - Fetch if this address has a defined language
  - Change the language of the spellchecker to the guessed one
*/

var automatic_dictionary = {
  
  //Constants
  ADDRESS_INFO_PREF:"extensions.automatic_dictionary.addressesInfo",
  POLLING_DELAY: 3000, //Miliseconds
  
  //Attributes
  user_overriden_lang: false,
  last_language_set: null,
  initialized: false,
  data: {},
  
  init: function(){
    if(this.initalized) return;
    this.prefManager = Components.classes["@mozilla.org/preferences-service;1"]
                                .getService(Components.interfaces.nsIPrefBranch);
    this.iter = 0; //ObserveRecipients execution counter
    setTimeout( "automatic_dictionary.loadData();",10 ); //Deferred
    this.initialized = true;
  },
  
  loadData: function(){
    var value = this.prefManager.getCharPref( this.ADDRESS_INFO_PREF );
    try{
        if( !value ){
            value = "{}";
        }
        eval("automatic_dictionary.data = ("+ value + ")");
    }catch( e ){
      //TODO: what??
      dump(e.toString()); //FIXME
      throw e;
    }
    //After data loaded, observe the adresses list to update lang if required
    this.observeRecipients();
  },
  
  saveData: function(){
    var value = "{}";
    if( this.data && this.data.toSource ){
      value = this.data.toSource();
    }else{
      //TODO: something happened!! what to do?
      dump(this.data);
    }
    this.prefManager.setCharPref( this.ADDRESS_INFO_PREF, value );
  },
  
  observeRecipients: function(){
    this.iter++;
    try{
      this.detectUserOverridenLanguage();
      this.deduceLanguage();
      //Queue next call
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
    if( current_lang != this.last_language_set ){
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
    var arr = this.getRecipients();
    var target_lang = null;
    for( var idx in arr ){
      var lang = this.getLangFor( arr[idx] );
      if( lang ){ 
        target_lang = lang;
        break;
      }
    }
    if(target_lang){
      this.setCurrentLang( target_lang );
      this.changeLabel( "Deduced " + target_lang );
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
    return arr;
  },
  
  changeLabel: function( str ){
    var x = document.getElementById("automatic-dictionary-panel");
    if(x) 
      x.label = str;
    else
      dump("no label found");
  }
}
automatic_dictionary.init();


