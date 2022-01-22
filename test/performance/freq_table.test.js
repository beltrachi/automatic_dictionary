import { benchmark } from '../helpers/ad_test_helper.js'
import { FreqTable } from "./../../addon/lib/freq_table";

test('FreqTable performance', (done) => {
    var amount = 1000;

    var obj = new FreqTable();
    benchmark(50, function () {
        for (var i = 0; i < amount; i++) {
            //10 diferent first items and 11 second items
            obj.add("a" + (i % 10));
        }
    }).then(() => {
        benchmark(50, function () {
            for (var i = 0; i < amount; i++) {
                //10 diferent first items and 11 second items
                obj.remove("a" + (i % 10));
            }
        }).then(done);
    })
});
