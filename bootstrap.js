var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");

function install(data, reason) {
}

function uninstall(data, reason) {
}

function startup(data, reason) {
  // Check if the window we want to modify is already open.
    let windows = Services.wm.getEnumerator("msgcompose");
    console.log("In startup!");
  while (windows.hasMoreElements()) {
    let domWindow = windows.getNext().QueryInterface(Ci.nsIDOMWindow);
    WindowListener.loadIntoWindow(domWindow);
  }

  // Wait for any new windows to open.
  Services.wm.addListener(WindowListener);
}

function shutdown(data, reason) {
  // When the application is shutting down we normally don't have to clean
  // up any UI changes made.
  if (reason == APP_SHUTDOWN) {
    return;
  }

  let windows = Services.wm.getEnumerator("msgcompose");
  while (windows.hasMoreElements()) {
    let domWindow = windows.getNext().QueryInterface(Ci.nsIDOMWindow);
    WindowListener.unloadFromWindow(domWindow);
  }

  // Stop listening for any new windows to open.
  Services.wm.removeListener(WindowListener);
}

var WindowListener = {

    async loadIntoWindow(window) {
        console.log("load (1/2): " + window.document.readyState);
        if (window.document.readyState != "complete") {
            // Make sure the window load has completed.
            await new Promise(resolve => {
                window.addEventListener("load", resolve, { once: true });
            });
        }

        this.loadIntoWindowAfterWindowIsReady(window);
    },

    loadIntoWindowAfterWindowIsReady(window) {
        var windowtype = window.document.documentElement
            .getAttribute("windowtype");
        console.log("Windowtype is: " + windowtype);
        console.log(window);
        console.log(window.document.URL);
        // Check if the opened window is the one we want to modify.
        if ( windowtype !== "msgcompose") {
            console.log("wrong window type: "+windowtype);
            return;
        }

        var log = console.log;
        console.log("load (2/2): " + window.document.readyState);
        let document = window.document;
        global = window;

        let { AutomaticDictionary } = ChromeUtils.import("chrome://automatic_dictionary/content/ad.js");

        AutomaticDictionary.initWindow(window);
    },

    unloadFromWindow(window) {
        console.log("unload: " + window.document.readyState);
        let document = window.document;

        // No need to do extra work here
        if (reason == BOOTSTRAP_REASONS.APP_SHUTDOWN){
            return;
        }

        //remove listeners and other unloading procs
        document.AutomaticDictionary.shutdown();

        // Take any steps to remove UI or anything from the window
        // document.getElementById() etc. will work here.
    },

    // nsIWindowMediatorListener functions
    onOpenWindow: function(xulWindow) {
        console.log("onOpenWindow: " + xulWindow);
        // A new window has opened.
        let domWindow = xulWindow.QueryInterface(Ci.nsIInterfaceRequestor)
            .getInterface(Ci.nsIDOMWindow);
        this.loadIntoWindow(domWindow);
    },

    onCloseWindow(xulWindow) {
    },

    onWindowTitleChange(xulWindow, newTitle) {
    },
};



