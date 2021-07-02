

import { apply } from "./../../addon/lib/pair_counter";

import { benchmark } from '../helpers/ad_test_helper.js'

var AutomaticDictionary = { Lib: {} };
apply(AutomaticDictionary);

test('PairCounter performance', async (done) => {
    var amount = 1000;

    var obj = new AutomaticDictionary.Lib.PairCounter();
    await benchmark( 5, function(){
        for(var i=0; i < amount; i++){
            //10 diferent first items and 11 second items
            obj.add("a"+(i%10),"b"+(i%11));
        }
    });

    await benchmark( 5, function(){
        for(var i=0; i < amount; i++){
            //10 diferent first items and 11 second items
            obj.remove("a"+(i%10),"b"+(i%11));
        }
    });

    await benchmark( 1, function(){
        obj.getFreq("a1","b1");
    });

    done();
});
