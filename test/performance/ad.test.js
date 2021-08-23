/**
 * @jest-environment ./test/helpers/jest-thunderbird-environment.cjs
 */

import { AutomaticDictionary } from './../../addon/ad';

import { mockComposeWindow, benchmark } from '../helpers/ad_test_helper.js'

beforeEach(async () => {
    browser._flushStorage();
    AutomaticDictionary.instances = [];
})

test('Ad overall performance', async (done) => {
    new AutomaticDictionary.Class({
        window: window,
        compose_window_builder: AutomaticDictionary.ComposeWindowStub,
        logLevel: 'error',
        deduceOnLoad: false
    }, async (ad) => {
        let compose_window = ad.compose_window;

        let status = { recipients: { "to": [], "cc": [] }, lang: null }
        mockComposeWindow(compose_window, status)

        /**
            Performance on high data stored
        */
        //Load data in a user usage workflow
        var size = 500, i;
        var sample_domains = [
            "google.com",
            "gmail.com",
            "italy.it",
            "spain.es",
            "catalonia.cat",
            "anything.com"
        ];

        //Fill structures
        for (i = 0; i < size; i++) {
            status.recipients = {
                "to":
                    ["username" + i + "@" + (sample_domains[(i % sample_domains.length)])],
                "cc": [""]
            };
            if (i % 2 == 0) {
                status.recipients["cc"] =
                    ["username" + (i + 2) + "@" + (sample_domains[((i + 2) % sample_domains.length)])]
            }
            status.lang = "lang" + (i % 8);
            await ad.languageChanged();
        }
        status.recipients = { "to": ["username-123@gmail.com"], "cc": [] };
        await benchmark(20,
            async function () {
                status.lang = 'lang3'
                await ad.languageChanged();
            }
        );
        await benchmark(20,
            async function () {
                await ad.deduceLanguage();
            }
        )
        expect(status.lang).toBe('lang3')
        done();
    });
});