/* eslint-disable object-shorthand */

// Get various parts of the WebExtension framework that we need.
var { ExtensionCommon } = ChromeUtils.import("resource://gre/modules/ExtensionCommon.jsm");

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
        }

      },
    };
  }
};