(function(){
    var bm_options = {soft:true}; 

    
    load("helpers/ad_test_helper.js");
    //The load path is from the call
    load("../chrome/content/ad.js");
    
    AutomaticDictionary.dump = function(msg){logger.debug("AD: "+msg)};
    assert.equal( true, automatic_dictionary_instance != null );
    
    /**
        Performance on high data stored
    */
    
    (function(){
        test_setup();
        var adi = new AutomaticDictionary.Class();
        
        //Prepare scenario
        // Collect setted languages on the interface
        var setted_langs = [];
        adi.setCurrentLang = function(lang){
            dictionary_object.dictionary = lang;
            setted_langs.push( lang );
        }

        //Load data in a user usage workflow
        
        var size = 500,
            i,recipients;
        var sample_domains = [
            "google.com",
            "gmail.com",
            "italy.it",
            "spain.es",
            "catalonia.cat",
            "anything.com"
        ]    
        
        //Fill structures
        logger.info("Filling structure with sample data ("+size+" items) ...")
        for(i=0;i< size; i++){
            recipients = {
                "to":
                        ["username"+i+"@"+(sample_domains[(i % sample_domains.length)])],
                "cc":   [""]
            };
            if(i%2 == 0){
                recipients["cc"]=
                    ["username"+(i+2)+"@"+(sample_domains[((i+2) % sample_domains.length)])]
            }
            mock_recipients( adi, recipients );
            call_language_changed( adi, "lang"+(i%8));
        }
        
        mock_recipients( adi, {"to":["username-123@gmail.com"],"cc":[""]});
        assert.benchmark(200,
            function(){
                call_language_changed( adi, "lang3");
            },
            bm_options
        );        
        
        assert.benchmark(50,
            function(){
                adi.deduceLanguage();
            }
        ,bm_options)
        
        assert.equal( 1, setted_langs.length);
        assert.equal( "lang3", setted_langs[0]);
        
        
    })();
            
    
})();