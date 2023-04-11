import { Shutdownable } from "./../lib/shutdownable.js";
import { Recipients } from './recipients.js';
/*
 * The main purpose is to allow to work on other windows besides compose, like
 * conversations compose extension.
 **/

/**
 *  params are:
 *    ad: automatic_dictionary instance
 *    name: plugin name
 *    logo_url: url of the plugin logo
 *    notification_time: time to show notifications in ms
 *
 **/
export const ComposeWindow = (function (params) {
  this.ad = params.ad;
  this.params = params;
  this.shutdown_chain = [];
  this.logger = params.logger;
  this.window = this.ad.window;
});

const waitAnd = function (fn) {
  setTimeout(fn, 800);
}

const getTabId = async function (self) {
  if (self.tabId) return self.tabId
  var window = await browser.windows.get(self.window.id, { populate: true });
  self.tabId = window.tabs[0].id;
  return self.tabId;
}

function normalizeRecipients(list) {
  var out = [];
  for (var i = 0, size = list.length; i < size; i++) {
    var item = list[i];
    try {
      out.push(extractEmail(item));
    } catch (e) {
      // Normalization could not find an email, lets use it as is.
      out.push(item);
    }
  }
  return out;
}

function extractEmail(text) {
  return text.match(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi)[0];
}

async function getEmailFromRecipients(recipients) {
  var out = [];
  for (var i = 0, size = recipients.length; i < size; i++) {
    var recipient = recipients[i];
    switch (recipient.type) {
      case "contact":
        var contact = await browser.contacts.get(recipient.id);
        out.push(contact.properties.PrimaryEmail);
        break;
      case "mailingList":
        var list = await browser.mailingLists.get(recipient.id);
        // Mailing list does not have an email so we try to get its name.
        out.push(list.properties.name);
        break;
    }
  }
  return out;
}

Object.assign(ComposeWindow.prototype, Shutdownable);

Object.assign(ComposeWindow.prototype, {

  name: "CompoWindow",
  logger: null,

  setListeners: function () {
    var _this = this;
    //capture language change event
    this.addListener(browser.compose.onActiveDictionariesChanged, async function (tab, dictionaries) {
      try {
        if (tab.id != await getTabId(_this)) {
          _this.logger.debug(`Ignoring tab id ${tab.id}, mine is ${await getTabId(_this)}`);
          return;
        }
        _this.ad.languageChanged();
      } catch (e) {
        _this.logger.error(e);
      }
    });
    // this.addListener(browser.compose_ext.onRecipientsChange, async function (tabId) {
    //   if (tabId != await getTabId(_this)) {
    //     _this.logger.debug("Ignoring tab id, mine is " + (await getTabId(_this)));
    //     return;
    //   }
    //   waitAnd(function () {
    //     _this.ad.deduceLanguage();
    //   });
    // });

    this.addListener(browser.windows.onFocusChanged, function (windowId) {
      if (_this.window.id != windowId) {
        _this.stopWatchingRecipients();
        _this.logger.debug("Ignoring onFocusChanged because different windowId");
        return
      }
      _this.startWatchingRecipients();
      waitAnd(function () {
        _this.ad.deduceLanguage();
      });
    });

    window.automatic_dictionary_initialized = true;
    this.shutdown_chain.push(function () {
      window.automatic_dictionary_initialized = false;
    });
    this.logger.debug("events registered");
    this.ad.addEventListener('shutdown', function () {
      _this.logger.debug("shutting down compose window");
      _this.shutdown();
    });
  },

  getCurrentLangs: async function () {
    let activeLanguages = await browser.compose.getActiveDictionaries(await getTabId(this));
    let languages = Object.entries(activeLanguages).filter(e => e[1]).map(e => e[0]);
    this.logger.debug(languages);
    this.logger.debug("Current langs are " + languages);
    return languages;
  },

  recipients: async function (recipientType) {
    recipientType = recipientType || "to";
    var tabId = await getTabId(this);
    var details = await browser.compose.getComposeDetails(tabId);
    var recipients = details[recipientType];
    if (typeof (recipients) == "string") {
      // Cast to array
      recipients = [recipients]
    }
    // Array of String or ComposeRecipients
    if (recipients.length > 0 && typeof (recipients[0]) == "string") {
      // Normalize recipients only when its raw string.
      recipients = normalizeRecipients(recipients);
    } else {
      // ComposeRecipients
      recipients = await getEmailFromRecipients(recipients);
    }
    return recipients;
  },

  changeLabel: async function (str) {
    this.logger.info("Changing label to: " + str);
    browser.compose_ext.showNotification(
      await getTabId(this),
      str,
      {
        logo_url: this.params.logo_url,
        notification_time: this.params.notification_time
      }
    );
  },
  changeLanguages: async function (langs) {
    browser.compose.setActiveDictionaries(await getTabId(this), langs);
  },
  canSpellCheck: async function () {
    // The code returned true for TB > 89. This version is using the new spellchecker
    // APIs which are available since 102 only, so we can now always return true.
    // By now we leave it here just in case TB has some situations where its not ready.
    return true;
  },
  stopWatchingRecipients: async function(){
    this.logger.debug("Stopping recipients watcher")
    if( !this.intervalId ) return;
    clearInterval(this.intervalId);
    this.intervalId = null;
  },
  startWatchingRecipients: async function(){
    if(this.intervalId) return;
    this.logger.debug("Starting recipients watcher")
    var _this = this;
    this.intervalId = setInterval(async function() {
      _this.checkRecipientsChanges();
    }, 1000);
    this.shutdown_chain.push(function () {
      _this.stopWatchingRecipients();
    });
  },
  checkRecipientsChanges: async function(){
    var currentRecipients = await this.getRecipientsString();
    this.logger.debug("Recipients watcher current recipients: "+ currentRecipients);
    if(this.lastRecipients != currentRecipients){
      this.lastRecipients = currentRecipients;
      // Recipients changed. Trigger event!
      this.ad.deduceLanguage();
    }
  },
  getRecipientsString: async function(){
    const recipients = new Recipients({
      to: await this.recipients(),
      cc: await this.recipients('cc')
    });
    return recipients.getKey();
  }
});
