import { Shutdownable } from "./../lib/shutdownable.js";

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

ComposeWindow.canManageWindow = function (window) {
  const regex = /chrome.*messengercompose\.(xul|xhtml)/
  return regex.test(window.document.location);
};

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
          console.debug(`Ignoring tab id ${tab.id}, mine is ${await getTabId(_this)}`);
          return;
        }
        _this.ad.languageChanged();
      } catch (e) {
        _this.logger.error(e);
      }
    });
    this.addListener(browser.compose_ext.onRecipientsChange, async function (tabId) {
      if (tabId != await getTabId(_this)) {
        _this.logger.debug("Ignoring tab id, mine is " + (await getTabId(_this)));
        return;
      }
      waitAnd(function () {
        _this.ad.deduceLanguage();
      });
    });

    this.addListener(browser.windows.onFocusChanged, function (windowId) {
      if (_this.window.id != windowId) {
        _this.logger.debug("Ignoring onFocusChanged because different windowId");
        return
      }

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

  getCurrentLang: async function () {
    let activeLanguages = await browser.compose.getActiveDictionaries(await getTabId(this));
    let languages = Object.entries(activeLanguages).filter(e => e[1]).map(e => e[0]);
    console.log({languages});
    let lang = languages[0];
    this.logger.debug("Current lang is " + lang);
    return lang;
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
  changeLanguage: async function (lang) {
    browser.compose.setActiveDictionaries(await getTabId(this), [lang]);
  },
  canSpellCheck: async function () {
    // The code returned true for TB > 89. This version is using the new spellchecker
    // APIs which are available since 102 only, so we can now always return true.
    return true;
  }
});
