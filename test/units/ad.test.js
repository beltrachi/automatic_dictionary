/**
 * @jest-environment ./test/helpers/jest-thunderbird-environment.cjs
 */

import { AutomaticDictionary } from './../../addon/ad';

import { jest } from '@jest/globals'


function mock_compose_window(compose_window, options){
    options.spellchecker_enabled = options.spellchecker_enabled || true

    compose_window.recipients = jest.fn(function(type){
        type = type || 'to';
        return options.recipients[type] || [];
    });
    compose_window.changeLabel = jest.fn();
    compose_window.showMessage = jest.fn();
    compose_window.changeLanguage = jest.fn(function(lang){ options.lang = lang; });
    compose_window.getCurrentLang = jest.fn(function(){ return options.lang });
    compose_window.canSpellCheck = jest.fn(async function(){ return options.spellchecker_enabled });
}

beforeEach(async () => {
    browser._flushStorage();
})

test('Initial boot', async (done) => {
    /**
     * Just check that it can boot from empty data.
    */
    var ad = new AutomaticDictionary.Class({
        window: window,
        compose_window_builder: AutomaticDictionary.ComposeWindowStub,
        logLevel: 'error',
        deduceOnLoad: false
    }, () => done() );
});

test('Internal methods?', async (done) => {
    /**
        Cases:
         1. Initial boot. We have empty hash, we set a recipient in the "TO", and set a lang.
            Check that deduceLanguage deduces the one we saved earlier.
    */
    new AutomaticDictionary.Class({
        window: window,
        compose_window_builder: AutomaticDictionary.ComposeWindowStub,
        logLevel: 'error',
        deduceOnLoad: false
    }, async (ad) => {
        let compose_window = ad.compose_window;

        let status = {recipients: {"to":["foo"],"cc":[]}, lang: null}
        mock_compose_window(compose_window, status)

        //Test internal methods
        expect(ad.stringifyRecipientsGroup(["aa","bb","ab"])).toBe("aa,ab,bb");

        expect(AutomaticDictionary.version).toContain('.');
        expect(ad.canSpellCheck()).resolves.toBe(true)
        expect(ad.compose_window.canSpellCheck()).resolves.toBe(true)
        await ad.deduceLanguage();

        expect(compose_window.changeLanguage).toHaveBeenCalledTimes(0);
        expect(compose_window.changeLabel).toHaveBeenCalledWith('noLangForRecipients');

        // Change the lang and trigger the event so language foolang gets associated
        // with foo.
        status.lang = "foolang";
        await ad.languageChanged();
        expect(compose_window.changeLanguage).toHaveBeenCalledTimes(0)
        expect(compose_window.changeLabel).toHaveBeenCalledTimes(2)
        expect(compose_window.changeLabel).toHaveBeenLastCalledWith('savedForRecipients')

        //Somewhere the lang is changed but you go back here and
        status.lang = 'other'
        await ad.deduceLanguage();

        expect(status.lang).toBe('foolang');

        //Set stopped.
        ad.stop();
        //Deduce language is aborted despite we change dict
        status.lang = "other";
        await ad.deduceLanguage();
        expect(status.lang).toBe('other');

        //When spellcheck disabled, do nothing
        ad.start();
        status.spellchecker_enabled = false;
        status.lang = "other";
        // TODO: fix this. we set count 100 to not let it delay the deduce language
        // execution 1s and being an async execution. Count 100 is greater than 10
        // so it does not postpone it.
        await ad.deduceLanguage({count: 100});
        expect(status.lang).toBe('other');

        //Enable again and everything ok.
        status.spellchecker_enabled = true;
        await ad.deduceLanguage();
        expect(status.lang).toBe('foolang');
        expect(compose_window.changeLabel).toHaveBeenLastCalledWith('savedForRecipients')

        //test notificationLevel error
        await ad.prefManager.set(ad.NOTIFICATION_LEVEL,"error");
        status.lang = "other";
        await ad.deduceLanguage();

        expect(compose_window.changeLabel).toHaveBeenCalledTimes(2);
        //Restore
        await ad.prefManager.set(ad.NOTIFICATION_LEVEL,"info");

        done(); return;
    });
});

/*

    2. We have an empty hash and we set a "TO" and a "CC". We set the dict,
    and check that it has been setted to the TO, to the CC alone, and the pair TO-CC.

*/
test('Tos and ccs', async (done) => {
    new AutomaticDictionary.Class({
        window: window,
        compose_window_builder: AutomaticDictionary.ComposeWindowStub,
        logLevel: 'error',
        deduceOnLoad: false
    }, async (ad) => {
        let compose_window = ad.compose_window;

        let status = { recipients: { "to": ["foo"], "cc": ["bar"] }, lang: null }
        mock_compose_window(compose_window, status)

        //Change the lang and it gets stored
        status.lang = 'foolang';
        await ad.languageChanged();

        // Setting individuals only will assign foolang too
        status.recipients = { "to": ["foo"] };
        status.lang = 'other';
        await ad.deduceLanguage();
        expect(status.lang).toBe('foolang');

        status.recipients = { "to": ["bar"] };
        status.lang = 'other';
        await ad.deduceLanguage();
        expect(status.lang).toBe('foolang');

        done();
    })
});


/*
    3. We have two TO's saved with diferent langs, we set them as the current
    recipients and check that the lang used is the one from the first recipient.

*/
test('TOs priorization', async (done) => {
    new AutomaticDictionary.Class({
        window: window,
        compose_window_builder: AutomaticDictionary.ComposeWindowStub,
        logLevel: 'debug',
        deduceOnLoad: false
    }, async (ad) => {
        let compose_window = ad.compose_window;
        // Store first the preference for each recipient
        let status = { recipients: { "to": ["catalan"] }, lang: null }
        mock_compose_window(compose_window, status)

        status.lang = 'ca'
        await ad.languageChanged();

        status.recipients = { "to": ["spanish"] };
        status.lang = 'es';
        await ad.languageChanged();

        // Scenario is ready

        status.recipients = { "to": ["spanish", "catalan"] };
        await ad.deduceLanguage();
        expect(status.lang).toBe('es')

        status.recipients = { "to": ["catalan", "spanish"] };

        await ad.deduceLanguage();
        expect(status.lang).toBe('ca')

        done();
    });
});



(function(){
    load("helpers/ad_test_helper.js");
    //The load path is from the call
    load("../chrome/content/ad.js");



    /*

         4. [Conditionals] We have already setted the "TO-A", "TO-A & CC-B" and "TO-B".
            We set the recipients to be: TO-A && CC-B to another lang. The new
            lang is saved to "TO-A & CC-B" but not to "TO-A" nor "TO-B" as they're
            already setted.
    */

    (function(){
        test_setup();
        var adi = ad_instance();

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

        // Setting lang to a group does not update the ones alone
        mock_recipients( adi, {"to":["A","B"]} );
        call_language_changed( adi, "toA-toB-lang");

        mock_recipients( adi, {"to":["A"]})
        adi.deduceLanguage();
        assert.equal( 4, setted_langs.length);
        assert.equal( "toA-lang", setted_langs[setted_langs.length -1]);
    })();

    /*        call_language_changed( adi, "toB-lang");


         5. Limit the max CCs or TOs management to a number to avoid loading
            the hash with useless data or too much processing of useless data.
            The max would be a configuration parameter (migrations! :) )

    */

    (function(){
        test_setup();
        var adi = ad_instance();

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
        // We do not want to update the current lang because
        // the user has manually changed the lang and do not
        // want it to be reverted.
        assert.equal( 1, setted_langs.length);

        // When the recipients goes lower the limit
        recipients.to.pop();
        call_language_changed( adi, "andromeda");
        dictionary_object.dictionary = 'unknown';
        //It restores the new one
        adi.deduceLanguage();
        assert.equal("andromeda", setted_langs[setted_langs.length-1]);
    })();

    /*

         6. We only call to changeLabel when something has changed to not bother
            the user too much.

    */
    (function(){
        test_setup();
        var adi = ad_instance();

        //Prepare scenario
        mock_recipients( adi, {"to":["foo"],"cc":["bar"]} );
        // Collect setted languages on the interface
        var setted_langs = [];
        var labels = [];
        adi.setCurrentLang = function(lang){
            dictionary_object.dictionary = lang;
            setted_langs.push( lang );
        }
        adi.changeLabel = function(level, str){ labels.push( str );}

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
        //We do not expect a new label because is the same lang as we were using
        assert.equal( 3, labels.length);

        //If it has changed it will update the lang but not notifying anybody
        //as this is what he has setted before. This happens when more than one
        //ad instance is open
        dictionary_object.dictionary = "other";
        adi.deduceLanguage();
        assert.equal( 3, labels.length);
        assert.equal( "foobar", dictionary_object.dictionary);

    })();

    /*

         8. Test using heuristics

    */
    (function(){
        test_setup();

        //Test migration. We store
        Components.savedPrefs["extensions.automatic_dictionary.addressesInfo"]=
            "{\"hash\":{\"oldfoo@mydom\":\"foobar\",\"foo[cc]foo2\":\"foobar2\"}," +
            "\"options\":{\"sorted_keys\":[\"oldfoo@mydom\",\"foo[cc]foo2\"],\"size\":5}}";
        Components.savedPrefs["extensions.automatic_dictionary.migrations_applied"]= "[\"201102130000\",\"201106032254\"]";
        Components.savedPrefs["extensions.automatic_dictionary.addressesInfo.version"]="1234";
        Components.savedPrefs["extensions.automatic_dictionary.addressesInfo.maxSize"]=5;

        var adi = ad_instance();

        assert.equalJSON([["mydom","foobar",1]], adi.freq_suffix.pairs());

        Components.savedPrefs[adi.ALLOW_HEURISTIC] = true;

        //Prepare scenario - mocking
        mock_recipients( adi, {
            "to":["foo"],
            "cc":["bar"]
            } );
        // Collect setted languages on the interface
        var setted_langs = [];
        var labels = [];
        adi.setCurrentLang = function(lang){
            dictionary_object.dictionary = lang;
            setted_langs.push( lang );
        }
        adi.changeLabel = function(level, str){
            labels.push( str );
        }

        adi.deduceLanguage();
        assert.equal( 1, labels.length);

        //No change
        adi.deduceLanguage();
        logger.debug(labels);
        assert.equal( 1, labels.length);

        mock_recipients( adi, {"to":["foo@bar.dom"]} );
        adi.deduceLanguage();
        adi.deduceLanguage();

        assert.equal( 2, labels.length);

        call_language_changed( adi, "foobar");

        assert.equal( 3, labels.length);

        adi.deduceLanguage();
        assert.equal( 3, labels.length);

        mock_recipients( adi, {"to":["abc@bar.dom"]} );

        adi.deduceLanguage();

        assert.equal( 4, labels.length);
        assert.equal("foobar", setted_langs[0]);

        //Test it's saved
        assert.equalJSON(
            [["mydom","foobar",1],["bar.dom","foobar",1]],
            adi.freq_suffix.pairs());
        assert.contains("bar.dom", Components.savedPrefs["extensions.automatic_dictionary.freqTableData"]);

        //Check that the expired key is removed form the freq_suffix too
        mock_recipients( adi, {
            "to":["abc2@bar2.dom","abc2@bar3.dom","abc2@bar4.dom","abc2@bar5.dom"]} );
        call_language_changed( adi, "foobar-x");

        //Max size is 5 but there is a key of all TOs composed which is the fifth position
        assert.equalJSON(
            [
                ["bar2.dom","foobar-x",1],["bar3.dom","foobar-x",1],
                ["bar4.dom","foobar-x",1],["bar5.dom","foobar-x",1]
            ],
            adi.freq_suffix.pairs()
        );

        //When we change preference, unregiser from freq_suffix the old pref
        // and set the new one. In this case we change the abc2@bar2.com preference
        mock_recipients( adi, {"to":["abc2@bar2.dom"]} );
        call_language_changed( adi, "foobar-changed");

        adi.deduceLanguage();

        assert.equalJSON([
                ["bar3.dom","foobar-x",1],
                ["bar4.dom","foobar-x",1],
                ["bar5.dom","foobar-x",1],
                ["bar2.dom","foobar-changed",1],
            ], adi.freq_suffix.pairs());

        //Test its saved on storage
        var adi2 = ad_instance();
        assert.equalJSON([
                ["bar3.dom","foobar-x",1],
                ["bar4.dom","foobar-x",1],
                ["bar5.dom","foobar-x",1],
                ["bar2.dom","foobar-changed",1],
            ], adi2.freq_suffix.pairs());

        //Test that on various recipients it ponderates the language.
        mock_recipients( adi, {"to":["abc2@bar2.dom2"]} );
        call_language_changed( adi, "dom2lang");

        mock_recipients( adi, {
            "to":[
                "abc3@bar2.dom",
                "abc2@bar3.dom2",
                "abc2@bar4.dom2",
                "abc2@bar5.dom2"
            ]} );

        adi.deduceLanguage();
        assert.equal("dom2lang", setted_langs[setted_langs.length -1]);

    })();


    /*

         9. Check when we set an unknown recipient and a known CC recipient. It should
            set/guess the lang setted for the other. The same when settting 2 TOs and one is
            known and the other not. It should use the known one.

    */

    (function(){
        test_setup();
        var adi = ad_instance();

        //Prepare scenario
        mock_recipients( adi, {"to":["a@a.com"]} );
        call_language_changed( adi, "lang-a");

        //Scenario ready

        // Collect setted languages on the interface
        var setted_langs = [];
        adi.setCurrentLang = function(lang){
            dictionary_object.dictionary = lang;
            setted_langs.push( lang );
        }

        mock_recipients( adi, {"to":["a@a.com","b@b.com"]} );
        //Language is setted
        adi.deduceLanguage();
        assert.equal( 1, setted_langs.length);
        assert.equal( "lang-a", setted_langs[0]);

        // When we have a cc recipient with known data, we can deduce it
        mock_recipients( adi, {
            "to":["c@c.com"],
            "cc":["a@a.com"]
        } );
        adi.deduceLanguage();
        assert.equal( 2, setted_langs.length);
        assert.equal( "lang-a", setted_langs[1]);

    })();

}); // This func is not executed, never.