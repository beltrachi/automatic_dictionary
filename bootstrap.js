//TODO: prepare the shutdown and unregister all listeners

"use strict";

var Ci = Components.interfaces;
var Cc = Components.classes;
var Cu = Components.utils;
var Cr = Components.results;

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
    ResourceRegister.init(aData.installPath, "automatic_dictionary");
     
    try {

        global.AutomaticDictionary = {};
        
        Cu.import("resource://automatic_dictionary/chrome/content/ad.js", global);
        
        Services.obs.addObserver({
            observe: function(aMsgFolder, aTopic, aData) {  
                try{
                    //window.gDBView.addColumnHandler("betweenCol", columnHandler);
                    global.AutomaticDictionary.conversationsDetected();
                }catch(e){
                    dump(e);
                }
            }
        }, "Conversations", false);
        
        for each (let w in fixIterator(Services.wm.getEnumerator(null))){
            global.AutomaticDictionary.initWindow(w);
        }

        // All future windows
        Services.ww.registerNotification({
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
        });

    } catch (e) {
        dump("fail");
        dump(e);
        dump(e.stack.toString());
    }
}

function shutdown(data, reason) {
    // No need to do extra work here
    if (reason == BOOTSTRAP_REASONS.APP_SHUTDOWN)
        return;

    ResourceRegister.uninit("automatic_dictionary");
    AutomaticDictionary.dump("shutdown");
}

function install(data, reason) {
}

function uninstall(data, reason) {
}