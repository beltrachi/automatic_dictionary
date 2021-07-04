// Using Chain of responsability to detect the language.
// Each logic will have its class and the first that succeeds is used.

const Deduction = function(language, method){
  this.language = language;
  this.method = method;
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

function deductionOrNull(value, method){
  if(!value){
    return null;
  }
  return new Deduction(value,method);
}

LanguageDeducer.prototype = {
  deduce: async function(){
    var context = await this.buildContext();
    var deduction = null;
    for(const deducer of this.deducerChain) {
      deduction = await deducer(context);
      if(deduction) break;
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
    return deductionOrNull(lang, context.ad.METHODS.REMEMBER);
  },
  rememberByTos: async function(context){
    const alltogether_key = context.ad.stringifyRecipientsGroup( context.recipients.to );
    const lang = await context.ad.getLangFor( alltogether_key );
    return deductionOrNull(lang, context.ad.METHODS.REMEMBER);
  },
  rememberByAnyTo: async function(context){
    var lang = null;
    for( const recipient of context.recipients.to ){
      lang = await context.ad.getLangFor( recipient );
      if( lang ){
        break;
      }
    }
    return deductionOrNull(lang, context.ad.METHODS.REMEMBER);
  },
  rememberByAnyCC: async function(context){
    var lang = null;
    for( const recipient of context.recipients.cc ){
      lang = await context.ad.getLangFor( recipient );
      if( lang ){
        break;
      }
    }
    return deductionOrNull(lang, context.ad.METHODS.REMEMBER);
  },
  guessFromTos: async function(context){
    if(await context.ad.allowHeuristic()){
      const lang = await context.ad.heuristic_guess(context.recipients.to);
      return deductionOrNull(lang, context.ad.METHODS.GUESS);
    }
  }
}
