let document = {
    getElementById: function(id){
        return {
            addEventListener: function(){}
        };
    },
    addEventListener: function(){}
};

// Mock thunderbird services
let window = {
    document: document,
    id: 123412 // Random window id
};
document.documentElement = document;

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
    windows: {
        onRemoved: {
            addListener: function(callback){
                pref_data._listeners = pref_data._listeners || {};
                pref_data._listeners.onRemoved = pref_data._listeners.onRemoved || []
                pref_data._listeners.onRemoved.push(callback);
            },
            getListeners: function(){
                return pref_data._listeners.onRemoved || [];
            }
        }
    },
    _flushStorage: function(){ pref_data = {} },
    _dumpStorage: function() { return pref_data }
}

module.exports = { browser: browser, window: window}