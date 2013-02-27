//TODO: prepare the shutdown and unregister all listeners

"use strict";

var Ci = Components.interfaces;
var Cc = Components.classes;
var Cu = Components.utils;
var Cr = Components.results;

var BOOTSTRAP_REASONS = {
  APP_STARTUP     : 1,
  APP_SHUTDOWN    : 2,
  ADDON_ENABLE    : 3,
  ADDON_DISABLE   : 4,
  ADDON_INSTALL   : 5,
  ADDON_UNINSTALL : 6,
  ADDON_UPGRADE   : 7,
  ADDON_DOWNGRADE : 8
};

Cu.import("resource://gre/modules/XPCOMUtils.jsm");
Cu.import("resource://gre/modules/Services.jsm");
Cu.import("resource:///modules/iteratorUtils.jsm");

let global = this;
let Log;

// from wjohnston (cleary for Fennec)
let ResourceRegister = {
    init: function(aFile, aName) {
        let resource = Services.io.getProtocolHandler("resource")
        .QueryInterface(Ci.nsIResProtocolHandler);
        let alias = Services.io.newFileURI(aFile);
        if (!aFile.isDirectory()) {
            alias = Services.io.newURI("jar:" + alias.spec + "!/", null, null);
        }
        resource.setSubstitution(aName, alias);
    },

    uninit: function(aName) {
        let resource = Services.io.getProtocolHandler("resource")
        .QueryInterface(Ci.nsIResProtocolHandler);
        resource.setSubstitution(aName, null);
    }
};

function startup(aData, aReason) {
        dump("\nSTARTUP CALLED\n");

    ResourceRegister.init(aData.installPath, "automatic_dictionary");
     
    try {

        global.AutomaticDictionary = {};
        
        
        Cu.import("resource://automatic_dictionary/chrome/content/ad.js", global);
        
        global.AutomaticDictionary.shutdown_chain = [];
        var shutdown_chain = global.AutomaticDictionary.shutdown_chain;

        var observer = {
            observe: function(aMsgFolder, aTopic, aData) {  
                try{
                    //window.gDBView.addColumnHandler("betweenCol", columnHandler);
                    global.AutomaticDictionary.conversationsDetected();
                }catch(e){
                    dump(e);
                }
            }
        };
        
        Services.obs.addObserver(observer, "Conversations", false);
        shutdown_chain.push(function(){
            Services.obs.removeObserver(observer, "Conversations");
        });
        
        for each (let w in fixIterator(Services.wm.getEnumerator(null))){
            global.AutomaticDictionary.initWindow(w);
        }

        // All future windows
        var ww_observer = {
            observe: function (aSubject, aTopic, aData) {
                try{
                    if (aTopic == "domwindowopened") {
                        aSubject.QueryInterface(Ci.nsIDOMWindow);
                        global.AutomaticDictionary.initWindow(aSubject.window);
                    }
                }catch(e){
                    dump("Failed registerNotification \n");
                    dump(e.toString());
                }
            }
        };
        Services.ww.registerNotification(ww_observer);
        shutdown_chain.push(function(){
            Services.ww.unregisterNotification(ww_observer);
        });
        
        

    } catch (e) {
        dump("fail");
        dump(e);
        dump(e.stack.toString());
    }
}

function shutdown(data, reason) {
    dump("\nCALLED SHUTDOWN\n");
    try{
        // No need to do extra work here
        if (reason == BOOTSTRAP_REASONS.APP_SHUTDOWN){
            return;
        }

        //remove listeners and other unloading procs
        var list = global.AutomaticDictionary.shutdown_chain;
        for(var x =0;x<list.length;x++){
            try{
                list[x]();
            }catch(e){
                global.AutomaticDictionary.logException(e);
            }
        }
        global.AutomaticDictionary.shutdown();

        ResourceRegister.uninit("automatic_dictionary");
        global.AutomaticDictionary.dump("shutdown");
    }catch(e){
        dump("EXCEPTION ON SH "+e.toString());
    }
}

function install(data, reason) {
    //TODO: move migrations here?
}

function uninstall(data, reason) {
}