// Using Chain of responsability to detect the language.
// Each logic will have its class and the first that succeeds is used.
import { Recipients } from './recipients.js';

const Deduction = function (languages, method, recipients) {
  this.languages = languages;
  this.method = method;
  this.recipients = recipients;
}

Deduction.METHODS = {
  REMEMBER: "remember",
  GUESS: "guess"
}

export const LanguageDeducer = function (ad) {
  this.ad = ad;

  this.deducerChain = [
    this.rememberByAllRecipients,
    this.rememberByTos,
    this.rememberByAnyTo,
    this.rememberByAnyCC,
    this.guessFromTos
  ]
}

function buildDeduction(value, method, context) {
  return new Deduction(value, method, context.recipients);
}

LanguageDeducer.prototype = {
  deduce: async function () {
    var context = await this.buildContext();
    var deduction = null;
    for (const deducer of this.deducerChain) {
      deduction = await deducer(context);

      if (deduction.languages) break;
    }
    return deduction;
  },

  buildContext: async function () {
    return {
      ad: this.ad,
      recipients: new Recipients({
        to: await this.ad.getRecipients(),
        cc: await this.ad.getRecipients('cc')
      }),
      languages: await this.ad.getCurrentLangs()
    }
  },

  rememberByAllRecipients: async function (context) {
    const toandcc_key = context.recipients.getKey();
    context.ad.logger.debug("Deducing language for: " + toandcc_key);
    const langs = await context.ad.getLangsFor(toandcc_key);
    return buildDeduction(langs, Deduction.METHODS.REMEMBER, context);
  },
  rememberByTos: async function (context) {
    const alltogether_key = new Recipients({ to: context.recipients.to }).getKey();
    const langs = await context.ad.getLangsFor(alltogether_key);
    return buildDeduction(langs, Deduction.METHODS.REMEMBER, context);
  },
  rememberByAnyTo: async function (context) {
    var langs = null;
    for (const recipient of context.recipients.to) {
      langs = await context.ad.getLangsFor(recipient);
      if (langs) {
        break;
      }
    }
    return buildDeduction(langs, Deduction.METHODS.REMEMBER, context);
  },
  rememberByAnyCC: async function (context) {
    var langs = null;
    for (const recipient of context.recipients.cc) {
      langs = await context.ad.getLangsFor(recipient);
      if (langs) {
        break;
      }
    }
    return buildDeduction(langs, Deduction.METHODS.REMEMBER, context);
  },
  guessFromTos: async function (context) {
    if (await context.ad.allowHeuristic()) {
      var lang = await context.ad.heuristicGuess(context.recipients.to);
      if(lang != null) { lang = [lang] }
      return buildDeduction(lang, Deduction.METHODS.GUESS, context);
    }
  }
}
