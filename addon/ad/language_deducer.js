// Using Chain of responsability to detect the language.
// Each logic will have its class and the first that succeeds is used.

const Deduction = function(language, method, recipients){
  this.language = language;
  this.method = method;
  this.recipients = recipients;
}

Deduction.METHODS = {
  REMEMBER:"remember",
  GUESS:"guess"
}

export const LanguageDeducer = function(ad){
  this.ad = ad;

  this.deducerChain = [
    this.rememberByAllRecipients,
    this.rememberByTos,
    this.rememberByAnyTo,
    this.rememberByAnyCC,
    this.guessFromTos
  ]
}

function buildDeduction(value, method, context){
  return new Deduction(value,method, context.recipients);
}

LanguageDeducer.prototype = {
  deduce: async function(){
    var context = await this.buildContext();
    var deduction = null;
    for(const deducer of this.deducerChain) {
      deduction = await deducer(context);
      if(deduction.language) break;
    }
    return deduction;
  },

  buildContext: async function(){
    return {
      ad: this.ad,
      recipients: {
        to: await this.ad.getRecipients(),
        cc: await this.ad.getRecipients('cc')
      }
    }
  },

  rememberByAllRecipients: async function (context) {
    const toandcc_key = context.ad.getKeyForRecipients(context.recipients);
    context.ad.logger.debug("Deducing language for: " + toandcc_key);
    const lang = await context.ad.getLangFor(toandcc_key);
    return buildDeduction(lang, Deduction.METHODS.REMEMBER, context);
  },
  rememberByTos: async function(context){
    const alltogether_key = context.ad.getKeyForRecipients( context.recipients.to );
    const lang = await context.ad.getLangFor( alltogether_key );
    return buildDeduction(lang, Deduction.METHODS.REMEMBER, context);
  },
  rememberByAnyTo: async function(context){
    var lang = null;
    for( const recipient of context.recipients.to ){
      lang = await context.ad.getLangFor( recipient );
      if( lang ){
        break;
      }
    }
    return buildDeduction(lang, Deduction.METHODS.REMEMBER, context);
  },
  rememberByAnyCC: async function(context){
    var lang = null;
    for( const recipient of context.recipients.cc ){
      lang = await context.ad.getLangFor( recipient );
      if( lang ){
        break;
      }
    }
    return buildDeduction(lang, Deduction.METHODS.REMEMBER, context);
  },
  guessFromTos: async function(context){
    if(await context.ad.allowHeuristic()){
      const lang = await context.ad.heuristicGuess(context.recipients.to);
      return buildDeduction(lang, Deduction.METHODS.GUESS, context);
    }
  }
}
