import { LRUHash } from "./../../addon/lib/lru_hash";

import { benchmark } from '../helpers/ad_test_helper.js'

test('LRU hash performance', async (done) => {
    var size = 500;
    var amount = 1000;
    var lru = new LRUHash({}, { size: size });

    expect(lru.size()).toBe(0)

    await benchmark(50, function () {
        for (var i = 0; i < amount; i++) {
            lru.set("a" + i, "v" + i);
        }
    });

    expect(lru.size()).toBe(size)

    await benchmark(20, function lru_hash_test_gets() {
        for (var i = 0; i < amount; i++) {
            lru.get("a" + i, "v" + i);
        }
    });

    expect(lru.size()).toBe(size)

    var str = lru.toJSON();
    var lru2 = new LRUHash();
    lru2.fromJSON(str);

    expect(lru2.size()).toBe(size)
    expect(lru.get("a" + (amount - 1))).toBe("v" + (amount - 1))
    done();
});