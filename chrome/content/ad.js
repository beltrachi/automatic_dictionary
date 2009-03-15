

/** 
 TODO:
  - Detect when a recipient has been added
  - Fetch if this address has a defined language
  - Change the language of the spellchecker to the guessed one
*/
var automatic_dictionary_class = function(){};
automatic_dictionary_class.prototype = {
  
  ADDRESS_INFO_PREF:"extensions.automatic_dictionary.addressesInfo",
  
  init: function(){
    this.prefManager = Components.classes["@mozilla.org/preferences-service;1"]
                                .getService(Components.interfaces.nsIPrefBranch);
    setTimeout( "automatic_dictionary.loadData();",0 );
  },
  
  loadData: function(){
    var value = this.prefManager.getCharPref( this.ADDRESS_INFO_PREF );
    try{
      eval("this.data = ("+ value+ ")");
    }catch( e ){
      //TODO: what??
      alert(e.toString());
    }
    this.saveData();
  },
  
  saveData: function(){
    var value = "{}";
    if( this.data && this.data.toSource ){
      value = this.data.toSource();
    }else{
      //TODO: something happened!! what to do?
    }
    this.prefManager.setCharPref( this.ADDRESS_INFO_PREF, value );
  }
}
var automatic_dictionary = new automatic_dictionary_class();
automatic_dictionary.init();

//setTimeout(function(){alert("foo");},0);

