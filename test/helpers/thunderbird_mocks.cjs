// Mock thunderbird services
let window = null;
let document = null;
let dictionary_object = {
    dictionary:"en"
};
let dump = function(msg){
    logger.debug(msg);
};
let StringBundle = function(){
    return {
        getString:function(){
            return "string-stub";
        },
        getFormattedString:function(){
            return "string-stub";
        }
    }
};

let Components = {
    //Custom key to save data during simulations.
    savedPrefs: {
        "extensions.automatic_dictionary.addressesInfo": "",
        "extensions.automatic_dictionary.addressesInfo.version":"",
        "extensions.automatic_dictionary.addressesInfo.lock": "",
        "extensions.automatic_dictionary.addressesInfo.maxSize": 200,
        "extensions.automatic_dictionary.allowHeuristic": true,
        "extensions.automatic_dictionary.notificationLevel": "info",
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
        },
        "@mozilla.org/steel/application;1":{
            getService: function(){
                return { console: { log: print } };
            }
        },
        "@mozilla.org/file/local;1":{
            createInstance: function(){
                return {
                    initWithPath:function(){},
                    exists: function(){ return true }
                }
            }
        },
        "@mozilla.org/network/file-output-stream;1":{
            createInstance: function(){
                return {
                    init: function(){}
                }
            }
        },
        "@mozilla.org/intl/converter-output-stream;1":{
            createInstance: function(){
                return {
                    init: function(){},
                    writeString: function(){},
                    close: function(){}
                }
            }
        }
    },
    interfaces:{
        nsIPrefBranch: ""
    },
    utils:{
        "import": function(){}
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
    gNotification: {
        notificationbox: {
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
        }
    },
    gSpellChecker: {
        canSpellCheck: true,
        enabled: true,
        mInlineSpellChecker: {
            spellChecker: {
                GetCurrentDictionary: function(){
                    return dictionary_object.dictionary;
                }
            }
        }
    },
    MutationObserver: function(func){
        return {
            observe: function(){}
        }
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
    },
    addEventListener: function(){},
    getAttribute: function(attr){
        if(attr == "lang"){
            return dictionary_object.dictionary
        }
    }
};
document.documentElement = document;

let AddonManager = {
    getAddonByID: function(){}
}

let built_images = [];
window.Image = function(){
    built_images.push(this);
};
let FileUtils = {
    getFile: function(){
        return { path: 'a file path' };
    }
}
let Services = {
    vc: {
        compare: function(version,otherVersion){
            //Always returning that other is lower than current version.
            return 1;
        }
    }
}
let AppConstants = {
    MOZ_APP_VERSION: '1.2.3.4'
}
let Log = {
    repository: {
        getLogger: function(){
            return {
                level: null,
                addAppender: function(){},
                info: function(msg){
                    //Send addon logs to test logger with debug level
                    logger.debug(msg);
                }
            };
        }
    },
    Level: {
        Debug: 1
    },
    ConsoleAppender: function(){},
    BasicFormatter: function(){},
    DumpAppender: function(){}
}

var pref_data = {};
var _get = async function(k, fallback){
    k = k.toString();
    var v = pref_data[k];
    if (typeof(v) == "undefined") {
        if( typeof(fallback) == "undefined"){
            throw "Undefined key "+k+" in store"
        }
        v = fallback;
    }
    return v;
};
var _set = async function(k,v){
    k = k.toString();
    pref_data[k] = v;
};

let prefs = {
    addObserver: function(){},
    removeObserver: function(){},
    getCharPref: _get,
    getIntPref: _get,
    setCharPref: _set,
    setIntPref: _set,
    getBoolPref: _get,
    setBoolPref: _set
};

local_storage = {
    get: async function(k, fallback){
        k = k.toString();
        var v = pref_data[k];
        if (typeof(v) == "undefined") { v = fallback };
        var hash = {};
        hash[k] = v ;
        return hash;
    },
    set: async function(pair){
        for (var key in pair){
            pref_data[key] = pair[key]
        }
    }
}

let browser = {
    compose: {
        getComposeDetails: function(tabId){
            return {};
        }
    },
    contacts: { get: function(){} },
    prefs: prefs,
    storage: { local: local_storage },
    i18n: {
        getMessage: function(key){ return key }
    },
    mailingLists: { get: function(){} },
    runtime: { getURL: function(){} },
    windows: { onRemoved: { addListener: function(){} } },
    _flushStorage: function(){ pref_data = {} },
    _dumpStorage: function() { return pref_data }
}

module.exports = { browser: browser, window: window}