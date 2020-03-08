/* eslint-disable object-shorthand */

// Get various parts of the WebExtension framework that we need.
var { ExtensionCommon } = ChromeUtils.import("resource://gre/modules/ExtensionCommon.jsm");

// You probably already know what this does.
var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");

// This is the important part. It implements the functions and events defined in schema.json.
// The variable must have the same name you've been using so far, "myapi" in this case.
var compose_ext = class extends ExtensionCommon.ExtensionAPI {
  getAPI(context) {
    return {
      // Again, this key must have the same name.
      compose_ext: {

        // A function.
        sayHello: async function(name) {
          Services.wm.getMostRecentWindow("mail:3pane").alert("Hello " + name + "!");
        },

        // An event. Most of this is boilerplate you don't need to worry about, just copy it.
        onLanguageChange: new ExtensionCommon.EventManager({
          context,
          name: "myapi.onLanguageChange",
          // In this function we add listeners for any events we want to listen to, and return a
          // function that removes those listeners. To have the event fire in your extension,
          // call fire.async.
          register(fire) {
            function callback(event, language) {
              return fire.async(language);
            }

            windowListener.add(callback);
            return function() {
              windowListener.remove(callback);
            };
          },
        }).api(),

        onRecipientsChange: new ExtensionCommon.EventManager({
          context,
          name: "myapi.onRecipientsChange",
          // In this function we add listeners for any events we want to listen to, and return a
          // function that removes those listeners. To have the event fire in your extension,
          // call fire.async.
          register(fire) {
            function callback(event, language) {
              return fire.async(language);
            }

            recipientsChangeWindowListener.add(callback);
            return function() {
              recipientsChangeWindowListener.remove(callback);
            };
          },
        }).api(),

      },
    };
  }
};

// A helpful class for listening to windows opening and closing.
// (This file had a lowercase E in Thunderbird 65 and earlier.)
var { ExtensionSupport } = ChromeUtils.import("resource:///modules/ExtensionSupport.jsm");

// This object is just what we're using to listen for toolbar clicks. The implementation isn't
// what this example is about, but you might be interested as it's a common pattern. We count the
// number of callbacks waiting for events so that we're only listening if we need to be.
var windowListener = new class extends ExtensionCommon.EventEmitter {
    constructor() {
        super();
        this.callbackCount = 0;
    }

    handleEvent(event) {
        console.log("handle event with event: ");
        console.log(event);
        // TODO: fetch which language is it.
        windowListener.emit("language-changed", 'es');
    }

    add(callback) {
        this.on("language-changed", callback);
        this.callbackCount++;

        if (this.callbackCount == 1) {
            ExtensionSupport.registerWindowListener("windowListener", {
                //TODO: set composer url.
                chromeURLs: ["chrome://messenger/content/messengercompose/messengercompose.xhtml"],
                onLoadWindow: function(window) {
                    console.log("Loaded window of messengercompose");
                    windowListener.subscribeLanguageChangeEvents(window);
                    //TODO: fetch language changed item and attach to it's event.
                    // let toolbox = window.document.getElementById("mail-toolbox");
                    // toolbox.addEventListener("click", windowListener.handleEvent);
                },
            });
        }
    }

    remove(callback) {
        this.off("language-changed", callback);
        this.callbackCount--;

        if (this.callbackCount == 0) {
            for (let window of ExtensionSupport.openWindows) {
                //TODO: remove event listeners from all windows
                // if (window.location.href == "chrome://messenger/content/messenger.xul") {
                //   let toolbox = window.document.getElementById("mail-toolbox");
                // toolbox.removeEventListener("click", this.handleEvent);
            }
        }
        ExtensionSupport.unregisterWindowListener("windowListener");
    }

    subscribeLanguageChangeEvents(window) {
        //We don't capture "spellcheck-changed" event because it's only fired
        //when language is changed in the context menu (rigt click menu). Not when changed
        //from any other source.

        // The document lang attribute is updated always so its the best way.
        var langObserver = new window.MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                if (mutation.type == "attributes" && mutation.attributeName == "lang") {
                    console.log("Lang attr mutation received");
                    // Todo: get which language it is!
                    console.log("Mutation is ");
                    console.log(mutation);
                    windowListener.handleEvent(mutation.target.getAttribute('lang'));
                }
            });
        });
        langObserver.observe(window.document.documentElement, { attributes: true });
    }
};


var recipientsChangeWindowListener = new class extends ExtensionCommon.EventEmitter {
    constructor() {
        super();
        this.callbackCount = 0;
    }

    handleEvent(event) {
        console.log("recipients change handle event with event: ");
        console.log(event);
        var tab = event.target.ownerDocument.defaultView.activeTab;
        console.log("Tab is ");
        console.log(tab);
        console.log(tab.id);
        recipientsChangeWindowListener.emit("recipients-changed", tab.id);
    }

    add(callback) {
        this.on("recipients-changed", callback);
        this.callbackCount++;

        if (this.callbackCount == 1) {
            ExtensionSupport.registerWindowListener("recipientsChangeWindowListener", {
                //TODO: set composer url.
                chromeURLs: ["chrome://messenger/content/messengercompose/messengercompose.xhtml"],
                onLoadWindow: function(window) {
                    console.log("Loaded window of messengercompose for recipients change");
                    recipientsChangeWindowListener.detectRecipientsChange(window);
                    //TODO: fetch language changed item and attach to it's event.
                    // let toolbox = window.document.getElementById("mail-toolbox");
                    // toolbox.addEventListener("click", recipientsChangeWindowListener.handleEvent);
                },
            });
        }
    }

    remove(callback) {
        this.off("recipients-changed", callback);
        this.callbackCount--;

        if (this.callbackCount == 0) {
            for (let window of ExtensionSupport.openWindows) {
                //TODO: remove event listeners from all windows
                // if (window.location.href == "chrome://messenger/content/messenger.xul") {
                //   let toolbox = window.document.getElementById("mail-toolbox");
                // toolbox.removeEventListener("click", this.handleEvent);
            }
        }
        ExtensionSupport.unregisterWindowListener("recipientsChangeWindowListener");
    }

    detectRecipientsChange(window) {
        // Attach to any change in the html that holds the recipients.
        // THIS IS NOT WORKING BECAUASE SOMETHING IS CAPTURING CHANGE EVENT!
        window.document.getElementById('recipientsContainer').addEventListener('change', function(event) {
                console.log('change on recipients container');
                console.log(event)
                recipientsChangeWindowListener.handleEvent(event);
            });
        // Workaround to at least calculate which language is correct.
        window.document.getElementById('msgSubject').addEventListener('focus', function(event) {
                console.log("focus on subject");
                recipientsChangeWindowListener.handleEvent(event);
            });

        window.document.getElementById('content-frame').addEventListener('focus', function(event){
                console.log("focus on body");
                recipientsChangeWindowListener.handleEvent(event);
            });
    }
};