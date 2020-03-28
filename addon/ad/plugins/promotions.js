/*
 *  This plugin triggers the user to share this plugin among its collegues
 *  and promote their usage.
 **/
//Constructor
export function apply(AutomaticDictionary){
  AutomaticDictionary.Plugins.Promotions = function(ad){
    this.init(ad);
  };

  AutomaticDictionary.Plugins.Promotions.prototype = {
    show_up_every: 30,
    min_usages: 30,

    allow_promotions_pref_key: "allowPromotions",

    message_distributions:{
      shareMessage: 50,
      reviewMessage: 50
      //localizeMessage: 10
    },

    //When the locale starts with es- use the spanish version.
    shareUrls:{
      "es-": 'http://beltrachi.github.com/automatic_dictionary/index-es.html',
      "*": "http://beltrachi.github.com/automatic_dictionary/"
    },

    //Called on ad boot
    init:function(ad){
      this.ad = ad;
      this.logger = ad.logger;
      var _this = this;
      this.logger.debug("Adding listener!")
      this.setListener( this.ad, "window-load", function(evt){
        _this.extensionLoaded(evt);
      });
      this.setListener( this.ad, "shutdown", function(evt){
        _this.shutdown();
      });

      this.addon = { reviewURL: "FIXME" };
    },

    log:function(msg){
      this.ad.logger.debug(msg);
    },

    extensionLoaded:function(){
      if(!this.promotionsAllowed()){
        this.logger.debug("Promotions are blocked");
        return;
      }
      var usages = this.ad.counterFor("usages");
      this.logger.debug("Usages are "+usages);
      this.logger.debug(" "+usages+" > "+this.min_usages+" && (usages % "+this.show_up_every+") ");
      this.logger.debug(" usages modul es " + (usages % this.show_up_every));
      if( usages > this.min_usages && ((usages % this.show_up_every) == 0)){
        this.showPromotionsMessage();
      }else{
        this.logger.debug("not this time");
      }
    },

    showPromotionsMessage:function(){
      this.logger.debug("Show promotions...");
      //We choose which one...
      var promo = this.choosePromotions();
      this.logger.debug("Choosen is "+promo);
      this[promo]();
    },
    
    //Choose based on the weighted preferences
    choosePromotions:function(){
      var rnd = Math.random();
      var total = 0, weight;
      var options = [];
      for( var m in this.message_distributions){
        weight = this.message_distributions[m]
        options.push({
          name: m, 
          weight: total
        });
        total += weight;
      }
      this.logger.debug(options.toSource());
      /*
       *  Now in options we have an ascendant acumulation like this:
       *  
       *  { shareMessage       0  }
       *  { reviewMessage      50 }
       *  { localizeMessage    70 }
       *  
       *  And the random is between 0 and 100. The number here is the lower range
       *  of each. localizeMessage will be chosen if the random sits between
       *  70 and 100.
       **/

      // We walk from the
      var point = rnd * total, it;
      this.logger.debug("Point is "+point+" from a total of "+total);
      for( var x=options.length-1; x>= 0; x--){
        it = options[x];
        if(it.weight < point){
          return it.name;
        }
      }
      return options[0].name;
    },
    //Delegate to AD
    showMessage:function(){
      return this.ad.showMessage.apply(this.ad, arguments);
    },
    
    launchExternalUrl:function(url){
      var messenger = Components.classes["@mozilla.org/messenger;1"].createInstance();
      messenger = messenger.QueryInterface(Components.interfaces.nsIMessenger);
      messenger.launchExternalURL(url);     
    },
    
    shareMessage:function(){
      var _this = this;
      var buttons = [
        {
          callback:function(){
            try{
              var url=_this.localizeUrl(_this.shareUrls);
              _this.launchExternalUrl(url);
            }catch(e){
              AutomaticDictionary.logException(e);
            }
          },
          label: this.t("PromotionsShareButton"),
          accessKey: ""
        },
      ];
      buttons = buttons.concat(this.defaultButtons());
      this.showMessage(this.t("PromotionsShareMessage"),{
        buttons: buttons
      });
    }, 
    
    reviewMessage:function(){
      var _this = this;
      var buttons = [
        {
          callback:function(){
            try{
              _this.openInternalUrl( _this.addon.reviewURL );
            }catch(e){
              AutomaticDictionary.logException(e);
            }
          },
          label: this.t("PromotionsReviewButton"),
          accessKey: ""
        },
      ];
      buttons = buttons.concat(this.defaultButtons());
      this.showMessage(this.t("PromotionsReviewMessage"),{
        buttons: buttons
      });
    },
    
    defaultButtons:function(){
      var _this = this;
      
      return [
        {
          callback:function(){},
          label: this.t("PromotionsNotNowButton"),
          accessKey: ""
        },
        {
          callback:function(){
            try{
              _this.ad.setPref(_this.allow_promotions_pref_key, false);
            }catch(e){
              AutomaticDictionary.logException(e);
            }
          },
          label: this.t("PromotionsNotAnyMoreButton"),
          accessKey: ""
        },
        
      ];
    },
    // You give the rules and it gets the right url.
    localizeUrl:function(rules){
      var current_locale = this.ad.window.navigator.language;
      for(var k in rules){
        //True if locale starts with k
        if( current_locale.indexOf(k) === 0 ){
          return rules[k]
        }
      }
      return rules["*"]; //Fallback url
    },
    
    
    promotionsAllowed: function(){
      var v = this.ad.getPref(this.allow_promotions_pref_key);
      this.logger.debug("Promallowed is :" + v);
      return v === true;
    },
    
    //delegate translations to AD
    t: function(k){
      this.logger.debug("get label for "+k);
      return this.ad.t(k);
    },
    
    openInternalUrl: function(url){
      var tabmail = this.ad.window.document.getElementById("tabmail");
      if (!tabmail) {
        // Try opening new tabs in an existing 3pane window
        var mail3PaneWindow = Components.classes["@mozilla.org/appshell/window-mediator;1"]
            .getService(Components.interfaces.nsIWindowMediator)
            .getMostRecentWindow("mail:3pane");
        if (mail3PaneWindow) {
          tabmail = mail3PaneWindow.document.getElementById("tabmail");
          mail3PaneWindow.focus();
        }
      }
      
      if (tabmail)
        tabmail.openTab("contentTab", {contentPage: url});
      else{
        this.ad.window.openDialog("chrome://messenger/content/", "_blank",
                                  "chrome,dialog=no,all", null,
                                  { tabType: "contentTab",
                                    tabParams: {contentPage: url} 
                                  });
      }
    }
  };

  //Method called by AD
  AutomaticDictionary.Plugins.Promotions.init = function(ad){
    new AutomaticDictionary.Plugins.Promotions(ad);
  }

  AutomaticDictionary.extend( 
    AutomaticDictionary.Plugins.Promotions.prototype,
    AutomaticDictionary.Plugins.PluginBase.prototype);


  AutomaticDictionary.enabled_plugins.push(AutomaticDictionary.Plugins.Promotions);
}