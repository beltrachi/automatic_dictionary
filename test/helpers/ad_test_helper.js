// Mock thunderbird services
Components = null;
window = null;
document = null;
var dictionary_object = {
    dictionary:undefined
}; 
dump = function(){};
    
function test_setup(){
    dictionary_object.dictionary = undefined;
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
                        logger.debug("asking for "+k + " and gets "+Components.savedPrefs[k]);
                        return Components.savedPrefs[k]; 
                    };
                    var _set = function(k,v){
                        logger.debug("seting "+k+" the value "+v);
                        Components.savedPrefs[k] = v; 
                    };
                    return {
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
                    
            }
        },
        interfaces:{
            nsIPrefBranch: ""
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
                    removeAllNotifications:function(){}
                };
            }
            return {
                addEventListener: function(){}
            };
    }
};
built_images = [];
Image = function(){
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
    adi.languageChanged( evt );
}
    
    
test_setup();