/*
 *  This plugin triggers the user to share this plugin among its collegues
 *  and promote their usage.
 **/
//Constructor
AutomaticDictionary.Plugins.Promotions = function(ad){
    this.init(ad);
}; 

//Method called by AD
AutomaticDictionary.Plugins.Promotions.init = function(ad){
    new AutomaticDictionary.Plugins.Promotions(ad);
}

AutomaticDictionary.extend( 
    AutomaticDictionary.Plugins.Promotions.prototype,
    AutomaticDictionary.Plugins.PluginBase.prototype);

Components.utils.import("resource://gre/modules/AddonManager.jsm");

//TODO: move code to plugin_base
AutomaticDictionary.extend( AutomaticDictionary.Plugins.Promotions.prototype,
{    
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
        var _this = this;
        this.log("Adding listener!")
        this.setListener( this.ad, "window-load", function(evt){
            _this.extensionLoaded(evt);
        });
        this.setListener( this.ad, "shutdown", function(evt){
            _this.shutdown();
        });
        
        this.getAddon();
    },
    
    log:function(msg){
        this.ad.log(msg);
    },
    
    extensionLoaded:function(){
        if(!this.promotionsAllowed()){
            this.log("Promotions are blocked");
            return;
        }
        var usages = this.ad.counterFor("usages");
        this.log("Usages are "+usages);
        this.log(" "+usages+" > "+this.min_usages+" && (usages % "+this.show_up_every+") ");
        this.log(" usages modul es " + (usages % this.show_up_every));
        if( usages > this.min_usages && ((usages % this.show_up_every) == 0)){
            this.showPromotionsMessage();
        }else{
            this.log("not this time");
        }
    },
    
    showPromotionsMessage:function(){
        this.log("Show promotions...");
        //We choose which one...
        var promo = this.choosePromotions();
        this.log("Choosen is "+promo);
        this.ad.collect_event("promotion","show",{
            label:promo
        });
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
        this.log(options.toSource());
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
        this.log("Point is "+point+" from a total of "+total);
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
                    _this.ad.collect_event("promotion","share");
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
                    _this.ad.collect_event("promotion","review");
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
            callback:function(){
                _this.ad.collect_event("promotion","not_now");
            },
            label: this.t("PromotionsNotNowButton"),
            accessKey: ""
        },
        {
            callback:function(){
                try{
                    _this.ad.setPref(_this.allow_promotions_pref_key, false);
                    _this.ad.collect_event("promotion","blocked");
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
        this.log("Promallowed is :" + v);
        return v === true;
    },
    
    //delegate translations to AD
    t: function(k){
        this.log("get label for "+k);
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
    },
    
    getAddon:function(){
        var _this = this;
        AddonManager.getAddonByID(this.ad.id, function(addon){
            _this.addon = addon;
        });
    }
});

AutomaticDictionary.enabled_plugins.push(AutomaticDictionary.Plugins.Promotions);