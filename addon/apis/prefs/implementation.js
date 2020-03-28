/* eslint-disable object-shorthand */

// Get various parts of the WebExtension framework that we need.
var { ExtensionCommon } = ChromeUtils.import("resource://gre/modules/ExtensionCommon.jsm");

// You probably already know what this does.
var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");

var pm = Components.classes["@mozilla.org/preferences-service;1"]
    .getService(Components.interfaces.nsIPrefBranch);

// This is the important part. It implements the functions and events defined in schema.json.
// The variable must have the same name you've been using so far, "myapi" in this case.
var prefs = class extends ExtensionCommon.ExtensionAPI {
  getAPI(context) {
    return {
      // Again, this key must have the same name.
      prefs: {
        getCharPref: async function(k,v){
          return pm.getCharPref(k,v);
        },
        getIntPref: async function(k,v){
          return pm.getIntPref(k,v);
        },
        getBoolPref: async function(k,v){
          return pm.getBoolPref(k,v);
        },
        setCharPref: async function(k,v){
            return pm.setCharPref(k,v);
        },
        setIntPref: async function(k,v){
            return pm.setIntPref(k,v)
        },
        setBoolPref: async function(k,v){
            return pm.setBoolPref(k,v);
        }
      }
    }
  }
};
