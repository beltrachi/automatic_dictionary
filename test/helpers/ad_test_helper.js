// Mock thunderbird services
Components = null;
window = null;
document = null;
var dictionary_object = {
    dictionary:"en"
}; 
dump = function(){};
StringBundle = function(){
    return {
        getString:function(){
            return "string-stub";
        },
        getFormattedString:function(){
            return "string-stub";
        }
    }
};
    
function test_setup(){
    dictionary_object.dictionary = "en";
    Components = {
        //Custom key to save data during simulations.
        savedPrefs: {
            "extensions.automatic_dictionary.addressesInfo": "",
            "extensions.automatic_dictionary.addressesInfo.version":"",
            "extensions.automatic_dictionary.addressesInfo.lock": "",
            "extensions.automatic_dictionary.addressesInfo.maxSize": 200,
            "extensions.automatic_dictionary.allowCollect": true,
            "extensions.automatic_dictionary.allowHeuristic": true,
            "extensions.automatic_dictionary.migrations_applied": "",
            "extensions.automatic_dictionary.freqTableData": "\"[]\""
        },
        classes:{
            "@mozilla.org/preferences-service;1":{
                getService: function(){             
                    var _get = function(k){
                        var v = Components.savedPrefs[k];
                        if(k == "spellchecker.dictionary"){
                            v = dictionary_object.dictionary;
                        }

                        logger.debug("asking for "+k + " and gets "+v);
                        return v; 
                    };
                    var _set = function(k,v){
                        logger.debug("seting "+k+" the value "+v);
                        Components.savedPrefs[k] = v; 
                    };
                    return {
                        addObserver: function(){},
                        removeObserver: function(){},
                        getCharPref: _get,
                        getIntPref: _get,
                        setCharPref: _set,
                        setIntPref: _set,
                        getBoolPref: _get,
                        setBoolPref: _set
                    };
                }
            },
            "@mozilla.org/spellchecker/engine;1":{
                getService: function(){
                    return dictionary_object;
                }             
                    
            },
            "@mozilla.org/moz/jssubscript-loader;1":{
                getService: function(){
                    return {
                        loadSubScript: function(url){
                            url = url.toString();
                            if( url.indexOf("chrome://global/content/") === 0 ){
                                // We stub gecko libs
                                url = url.replace("chrome://global/content/","./stubs/");
                            }else{
                                //  Loads scripts translating resource to path
                                //  It's not the same as loadSubscript but works for tests
                                // "resource://automatic_dictionary/chrome/content/lib.js"
                                url = url.replace("chrome://automatic_dictionary/","./../chrome/");
                            }
                            load(url);
                        }
                    }
                }
            }
        },
        interfaces:{
            nsIPrefBranch: ""
        },
        utils:{
            "import":function(){
                
            }
        }
    };
    
    window = {
        addEventListener: function(){},
        setTimeout:function(){},
        location:{
            host:"host",
            pathname:"pathname"
        },
        navigator:{
            language:"en_us"
        },
        document: document,
        gSpellChecker: {
            canSpellCheck: true,
            enabled: true
        }
    };
        
    document = {    
        getElementById: function(id){ 
            if(id ==="automaticdictionarystrings") return {
                getString: function(k){
                    return k;
                },
                getFormattedString: function(k,v){
                    return k
                    }
            };
            if( id == "automatic_dictionary_notification"){
                return {
                    PRIORITY_INFO_MEDIUM: 1,
                    getNotificationWithValue:function(){
                        return {};
                    },
                    appendNotification:function(){
                            
                    },
                    removeAllNotifications:function(){},
                    parentNode:{
                        insertBefore:function(){}
                    }
                };
            }
            if(id=="status-bar"){
                return {
                    parentNode:{
                        insertBefore:function(){
                            
                        }
                    }
                }
            }
            return {
                addEventListener: function(){}
            };
        },
        createElement: function(name){
            return{
                appendChild:function(item){
                    
                }
            };
        }
    };

    built_images = [];
    window.Image = function(){
        built_images.push(this);
    };
}
    
// Method to mock the recipients of an automatic_dictonary instance
var mock_recipients = function(inst, params){
    inst.getRecipients = function( type ){
        if( type && type === "cc"){
            return params[type] || [];
        }else{
            return params["to"] || [];
        }
    };
}
    
//Method to call deduce language with a lang
var call_language_changed = function( adi, lang ){
    var evt = {
        target:{
            value: lang
        }
    }
    dictionary_object.dictionary=lang;
    adi.languageChanged( evt );
}

function ad_instance(){
    return new AutomaticDictionary.Class( {window:window} );
}

    
test_setup();