import { benchmark } from '../helpers/ad_test_helper.js'

import { apply } from "./../../addon/lib/sorted_set";

var AutomaticDictionary = { Lib: {} };
apply(AutomaticDictionary);

test('SortedSet performance', async (done) => {
    var ss = AutomaticDictionary.Lib.SortedSet();

    await benchmark(5, function () {
        for (var i = 0; i < 1000; i++) {
            ss.push("a" + i);
        }
    });

    expect(ss.size()).toBe(1000);
    done();
});