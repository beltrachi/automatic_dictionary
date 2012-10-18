(function(){
    // Mock thunderbird services
    Components = null;
    window = null;
    document = null;
    var dictionary_object = {dictionary:undefined}; 
    
    function test_setup(){
        dictionary_object.dictionary = undefined;
        Components = {
            //Custom key to save data during simulations.
            savedPrefs: {
                "extensions.automatic_dictionary.addressesInfo": "",
                "extensions.automatic_dictionary.addressesInfo.version":"",
                "extensions.automatic_dictionary.addressesInfo.lock": "",
                "extensions.automatic_dictionary.addressesInfo.maxSize": 200,
                "extensions.automatic_dictionary.allowCollect": true,
                "extensions.automatic_dictionary.migrations_applied": ""
            },
            classes:{
                "@mozilla.org/preferences-service;1":{
                    getService: function(){             
                        var _get = function(k){
                            logger.debug("asking for "+k);
                            logger.debug("and gets "+Components.savedPrefs[k]);
                            return Components.savedPrefs[k]; 
                        };
                        var _set = function(k,v){
                            logger.debug("seting "+k);
                            logger.debug("value "+v);
                            Components.savedPrefs[k] = v; 
                        };
                        return {
                            getCharPref: _get,
                            getIntPref: _get,
                            setCharPref: _set,
                            setIntPref: _set,
                            getBoolPref: _get,
                            setBoolPref: _set
                        };
                    }
                },
                "@mozilla.org/spellchecker/engine;1":{
                    getService: function(){
                        return dictionary_object;
                    }             
                    
                }
            },
            interfaces:{
                nsIPrefBranch: ""
            }
        };
    
        window = {
            addEventListener: function(){},
            setTimeout:function(){},
            location:{host:"host",pathname:"pathname"},
            navigator:{language:"en_us"}
        };
        
        document = {    
            getElementById: function(id){ 
                if(id ==="automaticdictionarystrings") return {
                    getString: function(k){return k;},
                    getFormattedString: function(k,v){return k}
                };
                if( id == "automatic_dictionary_notification"){
                    return {
                        PRIORITY_INFO_MEDIUM: 1,
                        getNotificationWithValue:function(){
                            return {};
                        },
                        appendNotification:function(){
                            
                        },
                        removeAllNotifications:function(){}
                    };
                }
                return {addEventListener: function(){} };
            }
        };
        
        Image = function(){};
    }
    
    // Method to mock the recipients of an automatic_dictonary instance
    var mock_recipients = function(inst, params){
        inst.getRecipients = function( type ){
            if( type && type === "cc"){
                return params[type] || [];
            }else{
                return params["to"] || [];
            }
        };
    }
    
    //Method to call deduce language with a lang
    var call_language_changed = function( adi, lang ){
        var evt = {
            target:{ value: lang }
        }
        adi.languageChanged( evt );
    }
    
    
    test_setup();
    //The load path is from the call
    load("../chrome/content/ad.js")
    
    AutomaticDictionary.dump = function(msg){logger.debug("AD: "+msg)};
    assert.equal( true, automatic_dictionary_instance != null );
    

    /**
        Cases:
         1. Initial boot. We have empty hash, we set a recipient in the "TO", and set a lang. 
            Check that deduceLanguage deduces the one we saved earlier.
    */
    
    (function(){
        test_setup();
        var adi = new AutomaticDictionary.Class();
        
        //Prepare scenario
        mock_recipients( adi, {"to":["foo"],"cc":[]} );
        // Collect setted languages on the interface
        var setted_langs = [];
        adi.setCurrentLang = function(lang){
            dictionary_object.dictionary = lang;
            setted_langs.push( lang );
        }
        adi.deduceLanguage();
        
        assert.equal( 0, setted_langs.length);
        assert.equal( "", Components.savedPrefs[adi.ADDRESS_INFO_PREF] );
        
        //Change the lang!
        call_language_changed( adi, "foolang");
        
        adi.deduceLanguage();
        
        assert.equal( 1, setted_langs.length);
        assert.equal( "foolang", setted_langs[0]);
        
    })();
            
    /*
            
         2. We have an empty hash and we set a "TO" and a "CC". We set the dict,
            and check that it has been setted to the TO, to the CC alone, and the pair TO-CC.
            
    */
    (function(){
        test_setup();
        var adi = new AutomaticDictionary.Class();
        
        //Prepare scenario
        mock_recipients( adi, {"to":["foo"],"cc":["bar"]} );
        // Collect setted languages on the interface
        var setted_langs = [];
        adi.setCurrentLang = function(lang){ 
            dictionary_object.dictionary = lang;
            setted_langs.push( lang );
        }
        adi.deduceLanguage();
        
        assert.equal( 0, setted_langs.length);
        assert.equal( "", Components.savedPrefs[adi.ADDRESS_INFO_PREF] );
        
        //Change the lang!
        call_language_changed( adi, "foolang");
        
        adi.deduceLanguage();
        
        assert.equal( 1, setted_langs.length);
        assert.equal( "foolang", setted_langs[0]);
        
        mock_recipients( adi, {"to":["foo"]} );
        adi.deduceLanguage();
        assert.equal( 2, setted_langs.length);
        assert.equal( "foolang", setted_langs[setted_langs.length -1]);
        
        mock_recipients( adi, {"to":["bar"]} );
        adi.deduceLanguage();
        assert.equal( 3, setted_langs.length);
        assert.equal( "foolang", setted_langs[setted_langs.length -1]);
        
    })();
            
    /*
         
         3. We have two TO's saved with diferent langs, we set them as the current 
            recipients and check that the lang used is the one from the first recipient.
            
    */
    (function(){
        test_setup();
        var adi = new AutomaticDictionary.Class();
        
        //Prepare scenario
        
        mock_recipients( adi, {"to":["catalan"]} );
        // Collect setted languages on the interface
        var setted_langs = [];
        adi.setCurrentLang = function(lang){ 
            dictionary_object.dictionary = lang;
            setted_langs.push( lang );
        }
        call_language_changed( adi, "ca");
        mock_recipients( adi, {"to":["spanish"]} );
        call_language_changed( adi, "es");
        
        // Scenario is ready
        
        mock_recipients( adi, {"to":["spanish","catalan"]} );
        
        adi.deduceLanguage();
        
        assert.equal( 1, setted_langs.length);
        assert.equal( "es", setted_langs[0]);
        
        mock_recipients( adi, {"to":["catalan","spanish"]} );
        
        adi.deduceLanguage();
        
        assert.equal( 2, setted_langs.length);
        assert.equal( "ca", setted_langs[1]);
        
    })();            
            
    /*
         
         4. [Conditionals] We have already setted the "TO-A", "TO-A & CC-B" and "TO-B".
            We set the recipients to be: TO-A && CC-B to another lang. The new
            lang is saved to "TO-A & CC-B" but not to "TO-A" nor "TO-B" as they're
            already setted.
    */
    
    (function(){
        test_setup();
        var adi = new AutomaticDictionary.Class();
        
        //Prepare scenario        
        mock_recipients( adi, {"to":["A"]} );
        call_language_changed( adi, "toA-lang");
        mock_recipients( adi, {"to":["A"],"cc":["B"]} );
        call_language_changed( adi, "toAccB-lang");
        mock_recipients( adi, {"to":["B"]} );
        call_language_changed( adi, "toB-lang");
        
        //Scenario ready
        
        // Collect setted languages on the interface
        var setted_langs = [];
        adi.setCurrentLang = function(lang){ 
            dictionary_object.dictionary = lang;
            setted_langs.push( lang );
        }
        
        mock_recipients( adi, {"to":["A"],"cc":["B"]} );
        call_language_changed( adi, "new-toAccB-lang");
        //Language is setted
        adi.deduceLanguage();
        assert.equal( 1, setted_langs.length);
        assert.equal( "new-toAccB-lang", setted_langs[0]);
        
        //Check it has not affected the others
        mock_recipients( adi, {"to":["A"]} );
        adi.deduceLanguage();
        assert.equal( 2, setted_langs.length);
        assert.equal( "toA-lang", setted_langs[1]);
        
        mock_recipients( adi, {"to":["B"]} );
        adi.deduceLanguage();
        assert.equal( 3, setted_langs.length);
        assert.equal( "toB-lang", setted_langs[2]);
        
    })();
    
    /*
         
         5. Limit the max CCs or TOs management to a number to avoid loading
            the hash with useless data or too much processing of useless data.
            The max would be a configuration parameter (migrations! :) )
            
    */
    
    (function(){
        test_setup();
        var adi = new AutomaticDictionary.Class();
        
        //Prepare scenario
        var current_limit = 10;
        var recipients = {"to":[]};
        for( var i = 0; i < current_limit; i ++ ){
            recipients.to.push("recipient"+i);
        }
        
        mock_recipients( adi, recipients );
        call_language_changed( adi, "ca_es");

        // Collect setted languages on the interface
        var setted_langs = [];
        adi.setCurrentLang = function(lang){ 
            dictionary_object.dictionary = lang;
            setted_langs.push( lang );
        }
        
        adi.deduceLanguage();
        assert.equal( 1, setted_langs.length);
        assert.equal("ca_es", setted_langs[0]);
        
        //More than maxRecipients is discarded
        recipients.to.push("toomuch");
        
        mock_recipients( adi, recipients );
        call_language_changed( adi, "foobar");
        
        adi.deduceLanguage();
        assert.equal( 2, setted_langs.length);
        assert.equal("ca_es", setted_langs[1]);
        
    })();
    
    /*
            
         6. We only call to changeLabel when something has changed to not bother
            the user too much.
            
    */
    (function(){
        test_setup();
        var adi = new AutomaticDictionary.Class();
        
        //Prepare scenario
        mock_recipients( adi, {"to":["foo"],"cc":["bar"]} );
        // Collect setted languages on the interface
        var setted_langs = [];
        var labels = [];
        adi.setCurrentLang = function(lang){ 
            dictionary_object.dictionary = lang;
            setted_langs.push( lang );
        }
        adi.changeLabel = function(str){ labels.push( str );}
        
        adi.deduceLanguage();
        assert.equal( 1, labels.length);
        
        adi.deduceLanguage();
        logger.debug(labels);
        assert.equal( 1, labels.length);
        
        mock_recipients( adi, {"to":["foo"]} );
        adi.deduceLanguage();
        adi.deduceLanguage();
        
        assert.equal( 2, labels.length);
        call_language_changed( adi, "foobar");
        
        assert.equal( 3, labels.length);
        
        adi.deduceLanguage();
        //We expect a new label because the plugin detects that there is a lang for
        //these recipients now
        assert.equal( 4, labels.length);
    })();
    
    /*
            
         7. Test collecting statistical data on GA
            
    */
    (function(){
        test_setup();
        var adi = new AutomaticDictionary.Class();
        var ad_actions = [];
        adi.ga = {
            track:function(url){
                ad_actions.push(url);
            }
        }
        
        //Prepare scenario
        mock_recipients( adi, {"to":["foo"],"cc":["bar"]} );
        // Collect setted languages on the interface
        var setted_langs = [];
        var labels = [];
        adi.setCurrentLang = function(lang){ 
            dictionary_object.dictionary = lang;
            setted_langs.push( lang );
        }
        adi.changeLabel = function(str){ labels.push( str );}
        
        adi.deduceLanguage();
        assert.equal( 1, labels.length);
        assert.equal( 1, ad_actions.length);
        assert.equal( "/action/miss", ad_actions[0]);
        //No change
        adi.deduceLanguage();
        logger.debug(labels);
        assert.equal( 1, labels.length);
        assert.equal( 1, ad_actions.length);
        
        mock_recipients( adi, {"to":["foo"]} );
        adi.deduceLanguage();
        adi.deduceLanguage();
        
        assert.equal( 2, labels.length);
        assert.equal( 2, ad_actions.length);
        assert.equal( "/action/miss", ad_actions[1]);

        call_language_changed( adi, "foobar");
        
        assert.equal( 3, labels.length);
        assert.equal( 3, ad_actions.length);
        assert.equal( "/action/saved/foobar", ad_actions[2]);
        
        adi.deduceLanguage();
        //We expect a new label because the plugin detects that there is a lang for
        //these recipients now
        assert.equal( 4, labels.length);
        assert.equal( 4, ad_actions.length);
        assert.equal( "/action/hit/foobar", ad_actions[3]);
        
        ///////   Disable tracking
        
        Components.savedPrefs[adi.ALLOW_COLLECT_KEY] = false;
        
        mock_recipients( adi, {"to":["unknown"]} );
        adi.deduceLanguage();
        
        //No new tracking
        assert.equal( 4, ad_actions.length);
        
        call_language_changed( adi, "unknownlang");
        
        //No new tracking
        assert.equal( 4, ad_actions.length);
        
    })();
    
})();