import { apply } from "./../../addon/lib/lru_hash_v2";

var AutomaticDictionary = { Lib: {} };
apply(AutomaticDictionary);

import { apply as sorted_set_apply } from "./../../addon/lib/sorted_set";
sorted_set_apply(AutomaticDictionary);

test('LRU hash', () => {
    var constructor = AutomaticDictionary.Lib.LRUHashV2;
    var bm_options = { soft: true };
    var lru = new constructor({}, { size: 3 });

    lru.set("a", 1);
    expect(lru.get("a")).toBe(1)

    lru.set("b", "test");
    lru.set("c", "foo");

    expect(lru.get("b")).toBe("test")
    expect(lru.get("c")).toBe("foo")

    expect(lru.get("a")).toBe(1)

    //Adding another replaces the oldest
    lru.set("d", "ireplace");
    expect(lru.get("b")).toBeUndefined();
    expect(lru.get("a")).toBe(1)
    expect(lru.get("c")).toBe("foo")
    expect(lru.get("d")).toBe("ireplace")

    //Setting an already setted value does not expire anything
    lru.set("c", "foo");
    expect(lru.get("a")).toBe(1)
    expect(lru.get("c")).toBe("foo")
    expect(lru.get("d")).toBe("ireplace")

    lru = new constructor({}, { size: 500 });
    expect(lru.size()).toBe(0)

    for (var i = 0; i < 1000; i++) {
        lru.set("a" + i, "v" + i);
    }

    expect(lru.size()).toBe(500)
    for (var i = 0; i < 1000; i++) {
        lru.get("a" + i, "v" + i);
    }

    expect(lru.size()).toBe(500)

    var str = lru.serialize();
    var lru2 = eval(str);

    expect(lru2.size()).toBe(500)
    expect(lru.get("a999")).toBe("v999")

    // The a is the older and c is the newer so the a will be the next to expire
    lru = new constructor({ a: "1", b: 2, c: 3 }, { size: 3, sorted_keys: ["a", "b", "c"] });

    var data_string = lru.toJSON();
    lru2 = new constructor({}, {size: 3});

    var expired_pairs = [];
    lru2.expiration_callback = function (pair) {
        expired_pairs.push(pair);
    };

    lru2.fromJSON(data_string);

    expect(lru2.get("a")).toBe(lru.get("a"))
    expect(lru2.get("a")).toBe("1")

    lru2.set("d", "4");

    expect(lru2.size()).toBe(3)

    expect(lru2.get("d")).toBe("4")
    // b is the last on usage.
    expect(lru2.get("b")).toBeUndefined()
    expect(expired_pairs[0]).toStrictEqual(["b", 2]);
    expect(expired_pairs.length).toBe(1)

    //Test wrong keys
    lru = new constructor({ a: "1", b: 2, c: 3 },
        {
            size: 3,
            sorted_keys: ["a", "c", "z"]
        });

    var arr = lru.sorted_keys;
    if (arr.toArray) arr = arr.toArray();
    expect(arr).toStrictEqual(["b", "a", "c"])
});
