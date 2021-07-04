import { apply } from "./../../addon/lib/lru_hash_v2";

import { benchmark } from '../helpers/ad_test_helper.js'

var AutomaticDictionary = { Lib: {} };
apply(AutomaticDictionary);

import { apply as sorted_set_apply } from "./../../addon/lib/sorted_set";
sorted_set_apply(AutomaticDictionary);

test('LRU hash performance', async (done) => {
    var size = 500;
    var amount = 1000;
    var lru = new AutomaticDictionary.Lib.LRUHashV2( {}, { size: size } );

    expect(lru.size()).toBe(0)

    await benchmark(50, function(){
        for(var i=0; i < amount; i++){
           lru.set("a"+i, "v"+i);
        }
    });

    expect(lru.size()).toBe(size)

    await benchmark(20, function lru_hash_test_gets(){
        for(var i=0; i < amount; i++){
           lru.get("a"+i, "v"+i);
        }
    });

    expect(lru.size()).toBe(size)

    var str = lru.serialize();
    var lru2 = eval( str );

    expect(lru2.size()).toBe(size)
    expect(lru.get("a" + (amount-1))).toBe("v"+(amount-1))
    done();
});