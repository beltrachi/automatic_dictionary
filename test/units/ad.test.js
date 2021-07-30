/**
 * @jest-environment ./test/helpers/jest-thunderbird-environment.cjs
 */

import { AutomaticDictionary } from './../../addon/ad';

import { jest } from '@jest/globals'

import { mockComposeWindow } from '../helpers/ad_test_helper.js'

beforeEach(async () => {
    browser._flushStorage();
    AutomaticDictionary.instances = [];
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
    }, async (ad) => {
        let lruHash = await ad.data._object();
        expect(lruHash.max_size).toBe(1200)

        done()
    });
});

test('All instances share the same data objects', async (done) => {
    var ad = new AutomaticDictionary.Class({
        window: window,
        compose_window_builder: AutomaticDictionary.ComposeWindowStub,
        logLevel: 'error',
        deduceOnLoad: false
    }, async (ad) => {
        var other_ad = new AutomaticDictionary.Class({
            window: window,
            compose_window_builder: AutomaticDictionary.ComposeWindowStub,
            logLevel: 'error',
            deduceOnLoad: false
        }, async (other_ad) => {
            expect(ad.data).toStrictEqual(other_ad.data)
            expect(ad.freq_suffix).toStrictEqual(other_ad.freq_suffix)

            done()
        });
    });
});

test('Shutdown shuts down existing instances', async (done) => {
    var ad = new AutomaticDictionary.Class({
        window: window,
        compose_window_builder: AutomaticDictionary.ComposeWindowStub,
        logLevel: 'error',
        deduceOnLoad: false
    }, async (ad) => {
        ad.dispatchEvent = jest.fn();
        AutomaticDictionary.shutdown();
        expect(ad.dispatchEvent).toHaveBeenCalledWith({type:'shutdown'})
        done()
    });
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
        mockComposeWindow(compose_window, status)

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
        mockComposeWindow(compose_window, status)

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
        logLevel: 'error',
        deduceOnLoad: false
    }, async (ad) => {
        let compose_window = ad.compose_window;
        // Store first the preference for each recipient
        let status = { recipients: { "to": ["catalan"] }, lang: null }
        mockComposeWindow(compose_window, status)

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

/*

    4. [Conditionals] We have already setted the "TO-A", "TO-A & CC-B" and "TO-B".
    We set the recipients to be: TO-A && CC-B to another lang. The new
    lang is saved to "TO-A & CC-B" but not to "TO-A" nor "TO-B" as they're
    already setted.
*/

test('Do not overwrite individuals language when its a group language', async (done) => {
    new AutomaticDictionary.Class({
        window: window,
        compose_window_builder: AutomaticDictionary.ComposeWindowStub,
        logLevel: 'error',
        deduceOnLoad: false
    }, async (ad) => {
        let compose_window = ad.compose_window;

        // Store first the preference for each recipient
        let status = { recipients: {}, lang: null }
        mockComposeWindow(compose_window, status)

        //Prepare scenario
        status.recipients = { "to": ["A"] };
        status.lang = "toA-lang";
        await ad.languageChanged();
        status.recipients = { "to": ["A"], "cc": ["B"] };
        status.lang = "toAccB-lang";
        await ad.languageChanged();
        status.recipients = { "to": ["B"] };
        status.lang = "toB-lang";
        await ad.languageChanged();

        //Scenario ready
        status.recipients = { "to": ["A"], "cc": ["B"] };
        status.lang = "new-toAccB-lang";
        await ad.languageChanged();
        //Language is setted
        await ad.deduceLanguage();
        expect(status.lang).toBe("new-toAccB-lang");

        //Check it has not affected the others
        status.recipients = { "to": ["A"] };
        await ad.deduceLanguage();
        expect(status.lang).toBe("toA-lang");

        status.recipients = { "to": ["B"] };
        await ad.deduceLanguage();
        expect(status.lang).toBe("toB-lang");

        // Setting lang to a group does not update the ones alone
        status.recipients = { "to": ["A", "B"] };
        status.lang = "toA-toB-lang";
        await ad.languageChanged();

        status.recipients = { "to": ["A"] };
        await ad.deduceLanguage();
        expect(status.lang).toBe("toA-lang");
        done(); return;
    })
});

/*
    5. Limit the max CCs or TOs management to a number to avoid loading
    the hash with useless data or too much processing of useless data.
    The max would be a configuration parameter (migrations! :) )

*/
test('Max recipients assignment', async (done) => {
    new AutomaticDictionary.Class({
        window: window,
        compose_window_builder: AutomaticDictionary.ComposeWindowStub,
        logLevel: 'error',
        deduceOnLoad: false
    }, async (ad) => {
        let compose_window = ad.compose_window;

        // Store first the preference for each recipient
        let status = { recipients: {}, lang: null }
        mockComposeWindow(compose_window, status)

        //Prepare scenario
        status.recipients = { "to": ["A"] };
        status.lang = "toA-lang";
        await ad.languageChanged();

        //Prepare scenario
        var current_limit = 10;
        var recipients = { "to": [] };
        for (var i = 0; i < current_limit; i++) {
            recipients.to.push("recipient" + i);
        }

        status.recipients = recipients;
        status.lang = "ca_es";
        await ad.languageChanged();

        await ad.deduceLanguage();
        expect(status.lang).toBe('ca_es');

        //More than maxRecipients is discarded
        recipients.to.push("toomuch");

        status.lang = 'foobar';
        await ad.languageChanged();
        // We do not want to update the current lang because
        // the user has manually changed the lang and do not
        // want it to be reverted.
        expect(status.lang).toBe('foobar');

        // When the recipients goes lower the limit
        recipients.to.pop();
        status.lang = 'andromeda';
        await ad.languageChanged();

        status.lang = 'other';
        await ad.deduceLanguage();
        expect(status.lang).toBe("andromeda");
        done();
    });

});

/*

    6. We only call to changeLabel when something has changed to not bother
    the user too much.

*/
test('Minimize notifications', async (done) => {
    new AutomaticDictionary.Class({
        window: window,
        compose_window_builder: AutomaticDictionary.ComposeWindowStub,
        logLevel: 'error',
        deduceOnLoad: false
    }, async (ad) => {
        let compose_window = ad.compose_window;

        let status = { recipients: {}, lang: null }
        mockComposeWindow(compose_window, status)

        //Prepare scenario
        status.recipients = { "to": ["foo"], "cc": ["bar"] };

        await ad.deduceLanguage();
        expect(compose_window.changeLabel).toHaveBeenCalledTimes(1)
        expect(compose_window.changeLabel).toHaveBeenLastCalledWith('noLangForRecipients')

        await ad.deduceLanguage();
        expect(compose_window.changeLabel).toHaveBeenCalledTimes(1)

        status.recipients = { "to": ["foo"] };
        await ad.deduceLanguage();
        await ad.deduceLanguage();

        expect(compose_window.changeLabel).toHaveBeenCalledTimes(2)
        expect(compose_window.changeLabel).toHaveBeenLastCalledWith('noLangForRecipients')

        status.lang = 'foobar';
        await ad.languageChanged();

        expect(compose_window.changeLabel).toHaveBeenCalledTimes(3)
        expect(compose_window.changeLabel).toHaveBeenLastCalledWith('savedForRecipients')

        await ad.deduceLanguage();
        //We do not expect a new label because is the same lang as we were using
        expect(compose_window.changeLabel).toHaveBeenCalledTimes(3)

        //If it has changed it will update the lang but not notifying anybody
        //as this is what he has setted before. This happens when more than one
        //ad instance is open
        status.lang = 'other';
        await ad.deduceLanguage();
        expect(compose_window.changeLabel).toHaveBeenCalledTimes(3)
        expect(status.lang).toBe('foobar');
        done();
    });
});

test('When error on change language', async (done) => {
    new AutomaticDictionary.Class({
        window: window,
        compose_window_builder: AutomaticDictionary.ComposeWindowStub,
        logLevel: 'fatal',
        deduceOnLoad: false
    }, async (ad) => {
        let compose_window = ad.compose_window;

        let status = { recipients: {}, lang: 'en' }
        mockComposeWindow(compose_window, status)

        //Prepare scenario
        status.recipients = { "to": ["John"], "cc": [] };

        await ad.languageChanged();

        status.lang = 'es';

        // Mock 3 times raise an error
        [1,2,3].forEach(element => {
            compose_window.changeLanguage.mockImplementationOnce(() => {
                return new Promise(() => {
                    throw new Error("changeLanguage fake error");
                });
            })
        });
        ad.addEventListener('deduction-completed', function(){
            expect(status.lang).toBe('en');
            done();
        });

        await ad.deduceLanguage();
    });
});

describe('deduce language when spellchecker is not ready', () => {
    test('it retires and success', async (done) => {
        new AutomaticDictionary.Class({
            window: window,
            compose_window_builder: AutomaticDictionary.ComposeWindowStub,
            logLevel: 'fatal',
            deduceOnLoad: false
        }, async (ad) => {
            let compose_window = ad.compose_window;

            let status = { recipients: {to: 'foo', cc: 'bar'}, lang: 'en' }
            mockComposeWindow(compose_window, status)

            compose_window.canSpellCheck.mockResolvedValueOnce(false);

            ad.addEventListener('deduction-completed', function(){
                done();
            });

            await ad.deduceLanguage();
        });
    });

    test('after 10 retries, it stops', async (done) => {
        new AutomaticDictionary.Class({
            window: window,
            compose_window_builder: AutomaticDictionary.ComposeWindowStub,
            logLevel: 'fatal',
            deduceOnLoad: false
        }, async (ad) => {
            let compose_window = ad.compose_window;

            let status = { recipients: {to: 'foo', cc: 'bar'}, lang: 'en' }
            mockComposeWindow(compose_window, status)

            compose_window.canSpellCheck.mockResolvedValue(false);
            ad.addEventListener('deduction-failed', function(){
                done();
            });

            await ad.deduceLanguage();
        });
    });

})

/*
    8. Test using heuristics
*/
test('Heuristics', async (done) => {
    new AutomaticDictionary.Class({
        window: window,
        compose_window_builder: AutomaticDictionary.ComposeWindowStub,
        logLevel: 'error',
        deduceOnLoad: false
    }, async (ad) => {
        let compose_window = ad.compose_window;
        // Overwrite max_size of data hash
        let lruHash = await ad.data._object();
        lruHash.max_size = 5;

        let status = { recipients: {}, lang: null }
        mockComposeWindow(compose_window, status)

        //Prepare scenario
        status.recipients = {
            "to": ["foo"],
            "cc": ["bar"]
        };

        await ad.deduceLanguage();
        expect(compose_window.changeLabel).toHaveBeenLastCalledWith('noLangForRecipients')

        status.recipients = { "to": ["foo@bar.dom"] };
        status.lang = 'foobar';
        await ad.languageChanged();

        status.recipients = { "to": ["abc@bar.dom"] };
        await ad.deduceLanguage();

        expect(status.lang).toBe('foobar');
        expect(compose_window.changeLabel).toHaveBeenLastCalledWith('deducedLang.guess')
        //Test it's saved
        expect(await ad.freq_suffix.pairs()).toStrictEqual(
            [["bar.dom", "foobar", 1]],
        );

        //Check that the expired key is removed form the freq_suffix too
        status.recipients = {
            "to": ["abc2@bar2.dom", "abc2@bar3.dom", "abc2@bar4.dom", "abc2@bar5.dom"]
        };
        status.lang = "foobar-x";
        await ad.languageChanged();
        // TODO: OMG CURRENT IMPLEMENTATION DOES NOT HAVE MAX SIZE! :S only users that
        // migrated from initial versions :facepalm: FIX IT

        //Max size is 5 but there is a key of all TOs composed which is the fifth position
        expect(await ad.freq_suffix.pairs()).toStrictEqual(
            [
                ["bar2.dom", "foobar-x", 1], ["bar3.dom", "foobar-x", 1],
                ["bar4.dom", "foobar-x", 1], ["bar5.dom", "foobar-x", 1]
            ]
        );

        //When we change preference, unregiser from freq_suffix the old pref
        // and set the new one. In this case we change the abc2@bar2.com preference
        status.recipients = { "to": ["abc2@bar2.dom"] };
        status.lang = "foobar-changed";
        await ad.languageChanged();

        await ad.deduceLanguage();

        expect(await ad.freq_suffix.pairs()).toStrictEqual(
            [
            ["bar3.dom", "foobar-x", 1],
            ["bar4.dom", "foobar-x", 1],
            ["bar5.dom", "foobar-x", 1],
            ["bar2.dom", "foobar-changed", 1],
        ]);

        //Test its saved on storage
        expect((await browser.storage.local.get('freqTableData')).freqTableData).toStrictEqual(
            JSON.stringify(
                [
                    ["bar3.dom", "foobar-x", 1],
                    ["bar4.dom", "foobar-x", 1],
                    ["bar5.dom", "foobar-x", 1],
                    ["bar2.dom", "foobar-changed", 1],
                ]
            )
        );

        //Test that on various recipients it ponderates the language.
        status.recipients = { "to": ["abc2@bar2.dom2"] };
        status.lang = 'dom2lang';
        await ad.languageChanged()

        status.recipients = {
            "to": [
                "abc3@bar2.dom",
                "abc2@bar3.dom2",
                "abc2@bar4.dom2",
                "abc2@bar5.dom2"
            ]
        };

        await ad.deduceLanguage();
        expect(status.lang).toBe("dom2lang");
        done();
    });

});

/*

    9. Check when we set an unknown recipient and a known CC recipient. It should
    set/guess the lang setted for the other. The same when settting 2 TOs and one is
    known and the other not. It should use the known one.

*/

test('when only data is on CC recipients', async (done) => {
    new AutomaticDictionary.Class({
        window: window,
        compose_window_builder: AutomaticDictionary.ComposeWindowStub,
        logLevel: 'error',
        deduceOnLoad: false
    }, async (ad) => {
        let compose_window = ad.compose_window;

        let status = { recipients: {}, lang: null }
        mockComposeWindow(compose_window, status)

        //Prepare scenario
        status.recipients = { "to": ["a@a.com"] };
        status.lang = "lang-a";
        await ad.languageChanged();
        //Scenario ready

        status.recipients = { "to": ["a@a.com", "b@b.com"] };
        status.lang = 'other'
        //Language is setted
        await ad.deduceLanguage();
        expect(status.lang).toBe('lang-a')

        // When we have a cc recipient with known data, we can deduce it
        status.recipients = {
            "to": ["c@c.com"],
            "cc": ["a@a.com"]
        };
        status.lang = 'other'

        await ad.deduceLanguage();
        expect(status.lang).toBe('lang-a')
        done();
    })
});

test('migration to fix freq-suffix data', async (done) => {
    // Setup previous freq-suffix data
    const freq_suffix_previous_data = {
        freqTableData: JSON.stringify(
            [
                ["removed-example.es", "es", -3],
                ["example.es", "es", 1],
                ["example.com", "en", 1],
                ["bad-example.es[cc]real-me.com", "es", -1],
            ]
        )
    }
    await browser.storage.local.set(freq_suffix_previous_data)

    new AutomaticDictionary.Class({
        window: window,
        compose_window_builder: AutomaticDictionary.ComposeWindowStub,
        logLevel: 'error',
        deduceOnLoad: false
    }, async (ad) => {
        const pairs = await ad.freq_suffix.pairs();
        expect(pairs).toStrictEqual(
            [
                ["example.es", "es", 1],
                ["example.com", "en", 1]
            ]
        )
        done();
    });
});

test('LRU max size is read from config', async (done) => {
    // Setup previous freq-suffix data
    const max_size_value = { "addressesInfo.maxSize": 1234 }
    await browser.storage.local.set(max_size_value)

    new Promise((resolve, reject) => {
        new AutomaticDictionary.Class({
            window: window,
            compose_window_builder: AutomaticDictionary.ComposeWindowStub,
            logLevel: 'error',
            deduceOnLoad: false
        }, async (ad) => {
            let lruHash = await ad.data._object();
            expect(lruHash.max_size).toBe(1234)
            await ad.data.set('foo@bar.com', 'es')
            resolve()
        });
    }).then( async () => {
        // Flush memoized data structures
        AutomaticDictionary.instances = [];

        const max_size_value = { "addressesInfo.maxSize": 222 }
        await browser.storage.local.set(max_size_value)

        new AutomaticDictionary.Class({
            window: window,
            compose_window_builder: AutomaticDictionary.ComposeWindowStub,
            logLevel: 'error',
            deduceOnLoad: false
        }, async (ad) => {
            let lruHash = await ad.data._object();
            expect(lruHash.max_size).toBe(222)

            done();
        });
    });
 });
