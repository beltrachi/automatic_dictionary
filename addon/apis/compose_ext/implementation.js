/* eslint-disable object-shorthand */

// Get various parts of the WebExtension framework that we need.
var { ExtensionCommon } = ChromeUtils.import("resource://gre/modules/ExtensionCommon.jsm");

// You probably already know what this does.
var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");

// Compare semver versions 'x.y.z' (only numbers)
function compareVersion(v1, v2) {
  if (typeof v1 !== 'string') return false;
  if (typeof v2 !== 'string') return false;
  v1 = v1.split('.');
  v2 = v2.split('.');
  const commonPartsLength = Math.min(v1.length, v2.length);
  for (let i = 0; i < commonPartsLength; ++ i) {
      v1[i] = parseInt(v1[i], 10) || 0;
      v2[i] = parseInt(v2[i], 10) || 0;
      if (v1[i] > v2[i]) return 1;
      if (v1[i] < v2[i]) return -1;
  }
  return v1.length == v2.length ? 0 : (v1.length < v2.length ? -1 : 1);
}

// This is the important part. It implements the functions and events defined in schema.json.
// The variable must have the same name you've been using so far, "myapi" in this case.
var compose_ext = class extends ExtensionCommon.ExtensionAPI {
  getAPI(context) {
    let { extension } = context;
    let { tabManager, windowManager } = extension;
    async function getTabWindow(tabId){
      return (await tabManager.get(tabId)).nativeTab;
    }

    function ThunderbirdVersionGreaterOrEqual(otherVersion){
      return compareVersion(Services.appinfo.version, otherVersion) >= 0;
    }

    return {
      // Again, this key must have the same name.
      compose_ext: {

        showNotification: async function(tabId, string, options){
          options = options || {};
          var window = await getTabWindow(tabId);
          var notification_value = "show-message";
          let nb = (window.gNotification && window.gNotification.notificationbox) || window.gComposeNotification;
          var n = nb.getNotificationWithValue(notification_value);
          if(n) {
            n.label = string;
          } else {
            var buttons = options.buttons || [];
            var priority = nb.PRIORITY_INFO_HIGH;
            if(ThunderbirdVersionGreaterOrEqual('94')){
              n = nb.appendNotification(
                notification_value,
                {
                  image: options.logo_url,
                  priority: priority,
                  label: string
                },
                buttons);
            }else
              n = nb.appendNotification(string, notification_value, options.logo_url, priority, buttons);
          }
          // setup timeout
          if (options.notification_time) {
            if(this.label_timeout){
              window.clearTimeout(this.label_timeout);
            }
            this.label_timeout = window.setTimeout( function(){
              nb.removeNotification( n );
            }, options.notification_time);
          }
        },

        // An event. Most of this is boilerplate you don't need to worry about, just copy it.
        onRecipientsChange: new ExtensionCommon.EventManager({
          context,
          name: "compose_ext.onRecipientsChange",
          // In this function we add listeners for any events we want to listen to, and return a
          // function that removes those listeners. To have the event fire in your extension,
          // call fire.async.
          register(fire) {
            function callback(event_name, event) {
              let win = windowManager.wrapWindow(event.target.ownerGlobal);
              var tab = tabManager.convert(win.activeTab.nativeTab);
              return fire.async(tab.id);
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
    var lang = event.target.getAttribute('lang');
    windowListener.emit("language-changed", event, lang);
  }

  add(callback) {
    this.on("language-changed", callback);
    this.callbackCount++;

    if (this.callbackCount == 1) {
      ExtensionSupport.registerWindowListener("compose_ext-windowListener", {
        chromeURLs: ["chrome://messenger/content/messengercompose/messengercompose.xhtml"],
        onLoadWindow: function(window) {
          windowListener.subscribeLanguageChangeEvents(window);
        },
      });
    }
  }

  remove(callback) {
    this.off("language-changed", callback);
    this.callbackCount--;

    if (this.callbackCount == 0) {
      ExtensionSupport.unregisterWindowListener("compose_ext-windowListener");
    }
  }

  subscribeLanguageChangeEvents(window) {
    //We don't capture "spellcheck-changed" event because it's only fired
    //when language is changed in the context menu (rigt click menu). Not when changed
    //from any other source.

    // The document lang attribute is updated always so its the best way.
    var langObserver = new window.MutationObserver(function(mutations) {
      mutations.forEach(function(mutation) {
        if (mutation.type == "attributes" && mutation.attributeName == "lang") {
          windowListener.handleEvent(mutation);
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
    recipientsChangeWindowListener.emit("recipients-changed", event);
  }

  add(callback) {
    this.on("recipients-changed", callback);
    this.callbackCount++;

    if (this.callbackCount == 1) {
      ExtensionSupport.registerWindowListener("recipientsChangeWindowListener", {
        chromeURLs: ["chrome://messenger/content/messengercompose/messengercompose.xhtml"],
        onLoadWindow: function(window) {
          recipientsChangeWindowListener.detectRecipientsChange(window);
        },
      });
    }
  }

  remove(callback) {
    this.off("recipients-changed", callback);
    this.callbackCount--;

    if (this.callbackCount == 0) {
      ExtensionSupport.unregisterWindowListener("recipientsChangeWindowListener");
    }
  }

  detectRecipientsChange(window) {
    window.document.getElementById('recipientsContainer').addEventListener('change', function (event) {
      recipientsChangeWindowListener.handleEvent(event);
    });
    window.document.getElementById('recipientsContainer').addEventListener('focusout', function (event) {
      recipientsChangeWindowListener.handleEvent(event);
    });

    window.document.getElementById('msgSubject').addEventListener('focus', function(event) {
      recipientsChangeWindowListener.handleEvent(event);
    });

    window.document.getElementById('messageEditor').addEventListener('focus', function(event){
      recipientsChangeWindowListener.handleEvent(event);
    });
  }
};
