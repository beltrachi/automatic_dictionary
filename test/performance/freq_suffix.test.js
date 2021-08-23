import { FreqSuffix } from "./../../addon/lib/freq_suffix";
import { benchmark } from '../helpers/ad_test_helper.js'

test('FreqSuffix', async (done) => {

    var amount = 1000;
    var obj = new FreqSuffix({})
    //Realistic write!
    // A distribution of very variable a, not so on b and less on c.
    await benchmark(100, function freq_suffix_test_write() {
        var k;
        for (var i = 0; i < amount; i++) {
            k = "b" + (i % 11) + ".c" + (i % 10);
            if (i % 20 == 0) k = "a." + k;
            obj.add(k, "v" + (i % 5));
        }
    });

    //Read
    await benchmark(20, function freq_suffix_test_read() {
        var k;
        for (var i = 0; i < amount; i++) {
            k = "b" + (i % 100) + ".c" + (i % 10);
            obj.get("v" + i);
        }
    });
    done();
});