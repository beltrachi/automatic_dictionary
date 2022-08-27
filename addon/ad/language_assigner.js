import { PersistentObject } from "./../lib/persistent_object.js";
import { LRUHash } from "./../lib/lru_hash.js";
import { EventDispatcher } from './../lib/event_dispatcher.js';
import { Recipients } from './recipients.js';

export const LanguageAssigner = function (logger, storage) {
  this.logger = logger;
  this.storage = storage;

  this.initializeData();
}

LanguageAssigner.prototype = {
  ADDRESS_INFO_KEY: 'addressesInfo',
  initializeData: function () {
    const _this = this;
    var persistent_wrapper = new PersistentObject(
      this.ADDRESS_INFO_KEY,
      this.storage,
      {
        read: ["get", "keys", "pairs", "size", "setExpirationCallback"],
        write: ["set"],
        serializer: "toJSON",
        loader: "fromJSON",
        logger: this.logger
      },
      async function () {
        return new LRUHash({}, {
          logger: _this.logger,
          size: await _this.storage.get('addressesInfo.maxSize')
        });
      }
    );
    persistent_wrapper.setExpirationCallback(function (pair) {
      _this.dispatchEvent({
        type: 'assignment-removed',
        recipientsKey: pair[0],
        languages: pair[1]
      });
    });
    this.lruHash = persistent_wrapper;
  },
  languageChanged: async function (context, stats) {
    if (context.recipients.to.length == 0) {
      this.logger.debug('Empty recipients, skipping language changed')
      return;
    }
    await this.assignLangsToFullCombination(context, context.languages, stats);
    await this.assignLangsToFullTo(context, context.languages, stats);
    await this.assignLangsToAllIndividuallyIfNew(context, context.languages, stats);
  },

  assignLangsToFullCombination: async function (context, langs, stats) {
    await this.saveRecipientsToStructures(context.recipients, langs, stats,
      { force: true });
  },
  assignLangsToFullTo: async function (context, langs, stats) {
    if (context.recipients.to.length == 1) return;

    await this.saveRecipientsToStructures({ to: context.recipients.to }, langs, stats,
      { force: true });
  },

  assignLangsToAllIndividuallyIfNew: async function (context, langs, stats) {
    const all = context.recipients.to.concat(context.recipients.cc);
    for (var i in all) {
      await this.saveRecipientsToStructures({ to: [all[i]] }, langs, stats);
    }
  },
  // @param recipients [Hash] with "to" and "cc" keys
  saveRecipientsToStructures: async function (recipients, langs, stats, options) {
    options = options || {};
    var key = new Recipients(recipients).getKey();
    var force = options.force;
    var previous_languages = await this.getLangsFor(key);
    const languages_changed = previous_languages && previous_languages != langs;

    if (!previous_languages || (force && languages_changed)) {
      // Store it!
      this.logger.debug("assigning language " + langs + " to key " + key);
      await this.lruHash.set(key, langs);
      this.dispatchEvent({
        type: 'assignment-changed',
        recipients: recipients,
        recipientsKey: key,
        previousLanguages: previous_languages,
        language: langs[0], //TODO: remove it
        languages: langs
      })

      stats.saved_recipients++;
    }
  },

  getLangFor: async function (addr) {
    var value = await this.lruHash.get(addr);
    if ((typeof value) == "undefined" || value === "") value = null;

    return Promise.resolve(value);
  },
  getLangsFor: async function (addr) {
    var value = await this.lruHash.get(addr);
    if ((typeof value) == "undefined" || value === "") value = null;

    return Promise.resolve(value);
  }
}
Object.assign(LanguageAssigner.prototype, EventDispatcher);