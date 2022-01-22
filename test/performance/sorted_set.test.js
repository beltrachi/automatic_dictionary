import { benchmark } from '../helpers/ad_test_helper.js'

import { SortedSet } from "./../../addon/lib/sorted_set";

test('SortedSet performance', (done) => {
    var ss = SortedSet();

    benchmark(20, function () {
        for (var i = 0; i < 1000; i++) {
            ss.push("a" + i);
        }
    }).then(() => {
        expect(ss.size()).toBe(1000);
        done();
    })
});