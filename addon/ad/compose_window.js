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
const NOTIFICATION_ID = "automatic-dictionary-addon"

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

async function stopWatchingRecipients(self) {
  self.logger.debug("Stopping recipients watcher")
  if (!self.intervalId) return;
  clearInterval(self.intervalId);
  self.intervalId = null;
}
async function startWatchingRecipients(self) {
  if (self.intervalId) return;
  self.logger.debug("Starting recipients watcher")
  self.intervalId = setInterval(async function () {
    checkRecipientsChanges(self);
  }, 1000);
}

async function checkRecipientsChanges(self) {
  var currentRecipients = await getRecipientsString(self);
  self.logger.debug("Recipients watcher current recipients: " + currentRecipients);
  if (self.lastRecipients != currentRecipients) {
    self.lastRecipients = currentRecipients;
    // Recipients changed. Trigger event!
    self.ad.deduceLanguage();
  }
}

async function getRecipientsString(self) {
  const recipients = new Recipients({
    to: await self.recipients(),
    cc: await self.recipients('cc')
  });
  return recipients.getKey();
}

Object.assign(ComposeWindow.prototype, Shutdownable);

Object.assign(ComposeWindow.prototype, {

  name: "ComposeWindow",
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

    this.addListener(browser.windows.onFocusChanged, function (windowId) {
      if (_this.window.id != windowId) {
        // Another window has the focus now
        stopWatchingRecipients(_this);
        _this.logger.debug("onFocusChanged of different windowId, skip deducingLanguage");
        return
      }

      startWatchingRecipients(_this);
      waitAnd(function () {
        _this.ad.deduceLanguage();
      });
    });
    this.shutdown_chain.push(function () {
      stopWatchingRecipients(_this);
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
    browser.notifications.create(NOTIFICATION_ID, {
      type: "basic",
      iconUrl: this.params.logo_url,
      title: "Automatic Dictionary Addon",
      message: str,
    });
    if (this.clearTimeoutId) {
      clearTimeout(this.clearTimeoutId);
    }
    this.clearTimeoutId = setTimeout(function() {
      browser.notifications.clear(NOTIFICATION_ID)
    }, this.params.notification_time);
  },
  changeLanguages: async function (langs) {
    browser.compose.setActiveDictionaries(await getTabId(this), langs);
  },
  canSpellCheck: async function () {
    // The code returned true for TB > 89. This version is using the new spellchecker
    // APIs which are available since 102 only, so we can now always return true.
    // By now we leave it here just in case TB has some situations where its not ready.
    return true;
  }
});
