import { benchmark } from '../helpers/ad_test_helper.js'

var AutomaticDictionary = { Lib: {} };

import { apply as freq_table_apply } from "./../../addon/lib/freq_table";
freq_table_apply(AutomaticDictionary);

test('FreqTable performance', async (done) => {
    var amount = 1000;

    var obj = new AutomaticDictionary.Lib.FreqTable();
    await benchmark( 50, function(){
        for(var i=0; i < amount; i++){
            //10 diferent first items and 11 second items
            obj.add("a"+(i%10));
        }
    });

    await benchmark( 50, function(){
        for(var i=0; i < amount; i++){
            //10 diferent first items and 11 second items
            obj.remove("a"+(i%10));
        }
    });
    done();
});
