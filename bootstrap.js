
"use strict";

const Ci = Components.interfaces;
const Cc = Components.classes;
const Cu = Components.utils;
const Cr = Components.results;

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

//Cu.import("resource://automatic_dictionary/content/ad.js", global);

dump("ad is ");
dump(global.AutomaticDictionary);

function startup(aData, aReason) {
    ResourceRegister.init(aData.installPath, "automatic_dictionary");
     
    dump("Startup for AD");

    //    Log = setupLogging("Conversations.MonkeyPatch");

    try {
        // Import all required plugins. If you create a new plugin, install it here.
        //        Cu.import("resource://conversations/modules/plugins/glodaAttrProviders.js");
        //        Cu.import("resource://conversations/modules/plugins/embeds.js");

        // Patch all existing windows
        dump("Startup for AD 1");
        for each (let w in fixIterator(Services.wm.getEnumerator(null))){
            AutomaticDictionary.dump("For each window...");
            //Cu.import("resource://automatic_dictionary/content/ad.js");
            global.AutomaticDictionary.initWindow(w);
        }

        dump("Startup for AD 2");
        // All future windows
        Services.ww.registerNotification({
            observe: function (aSubject, aTopic, aData) {
                var ctx = function(){};
                try{
                    dump("Observe window? "+aSubject +":"+ aTopic + "\n");
                    if (aTopic == "domwindowopened") {
                        dump("Detected event window opened!!!\n")
                        aSubject.QueryInterface(Ci.nsIDOMWindow);
                        Cu.import("resource://automatic_dictionary/chrome/content/ad.js", ctx);
                        ctx.AutomaticDictionary.initWindow(aSubject.window);
                    }
                }catch(e){
                    dump("Failed registerNotification \n");
                    dump(e.toString());
                }
            }
        });
        dump("Startup for AD 3");

        // Assistant.
        //        if (Prefs.getInt("conversations.version") < conversationsCurrentVersion)
        //            Services.ww.openWindow(
        //        null,
        //        "chrome://conversations/content/assistant/assistant.xhtml",
        //        "",
        //        "chrome,width=800,height=500", {});
    } catch (e) {
        dump("fail");
        AutomaticDictionary.dump(e);
        dumpCallStack(e);
    }
}

function shutdown(data, reason) {
    // No need to do extra work here
    if (reason == BOOTSTRAP_REASONS.APP_SHUTDOWN)
        return;

    ResourceRegister.uninit("automatic_dictionary");
    AutomaticDictionary.dump("shutdown");
    //    for each (let w in fixIterator(Services.wm.getEnumerator("mail:3pane")))
    //      w.Conversations.monkeyPatch.undo(reason);
}

function install(data, reason) {
}

function uninstall(data, reason) {
}