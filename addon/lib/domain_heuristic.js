import { FreqTable } from "./freq_table.js";
import { PersistentObject } from "./persistent_object.js";
import { FreqSuffix } from "./freq_suffix.js";

export const DomainHeuristic = function (storage, logger, pref_key, languageAssigner) {
  this.storage = storage;
  this.logger = logger;
  this.freqTablekey = pref_key,

    this.initFreqSuffix(languageAssigner);
}

DomainHeuristic.prototype = {
  initFreqSuffix: function (languageAssigner) {
    //Build the object that will manage the storage for the object
    var persistent_wrapper = new PersistentObject(
      this.freqTablekey,
      this.storage,
      {
        read: ["get", "pairs"],
        write: ["add", "remove"],
        serializer: "toJSON",
        loader: "fromJSON"
      },
      function () {
        return new FreqSuffix();
      }
    );
    this.freq_suffix = persistent_wrapper;
    var _this = this;
    languageAssigner.addEventListener('assignment-removed', function (event) {
      if (_this.keyIsSingle(event.recipientsKey)) {
        _this.removeHeuristic(event.recipientsKey, _this.serializeLangs(event.languages));
      }
    });
    this.setListeners(languageAssigner);
  },

  setListeners: function (languageAssigner) {
    const _this = this;
    languageAssigner.addEventListener('assignment-changed', function (event) {
      _this.onRecipientLanguageAssignmentChange(event)
    })
    this.logger.debug('Setted event listener for assignment-changed')
  },

  onRecipientLanguageAssignmentChange: async function (event) {
    if (!this.isSingle(event.recipients)) return;

    if (event.previousLanguages) {
      await this.removeHeuristic(event.recipientsKey, this.serializeLangs(event.previousLanguages));
    }
    await this.saveHeuristic(event.recipientsKey, this.serializeLangs(event.languages));
  },

  isSingle(recipients) {
    const empty_cc = !recipients.cc || recipients.cc.length == 0
    return empty_cc && recipients.to.length == 1;
  },
  saveHeuristic: async function (recipient, lang) {
    this.logger.debug("saving heuristic for " + recipient + " to " + lang);
    var parts = recipient.split("@");
    if (parts[1]) {
      await this.freq_suffix.add(parts[1], lang);
    }
  },

  removeHeuristic: async function (recipient, lang) {
    this.logger.debug("removing heuristic for " + recipient + " to " + lang);
    var parts = recipient.split("@");
    if (parts[1]) {
      await this.freq_suffix.remove(parts[1], lang);
    }
  },

  // True when the key represents a single email
  keyIsSingle: function (key) {
    let parts = key.split('[cc]');
    let tos_size = parts[0].split(',').length;
    let ccs_empty = parts.length == 1 || parts[1] == ""

    if (tos_size == 1 && ccs_empty) {
      return true;
    }
    return false;
  },

  //Return the most frequent lang among all recipients
  heuristicGuess: async function (recipients) {
    var recipient, parts, rightside, lang,
      freq_table = new FreqTable();
    for (var i = 0; i < recipients.length; i++) {
      recipient = recipients[i];
      parts = recipient.split("@");
      rightside = parts[parts.length - 1];
      this.logger.debug("Looking for heuristic for " + rightside);
      lang = await this.freq_suffix.get(rightside, true);
      if (lang) {
        freq_table.add(lang);
      }
    }
    const result = freq_table.getFirst();
    if (result) {
      return this.deserializeLangs(result)
    }
    return result;
  },
  serializeLangs: function(langs){
    return langs.join(',');
  },
  deserializeLangs: function(string){
    return string.split(',')
  }
}