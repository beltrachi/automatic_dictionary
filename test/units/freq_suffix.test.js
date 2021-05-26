import { apply } from "./../../addon/lib/freq_suffix";

var AutomaticDictionary = { Lib: {} };
apply(AutomaticDictionary);

import { apply as freq_table_apply } from "./../../addon/lib/freq_table";
freq_table_apply(AutomaticDictionary);

import { apply as pair_counter_apply } from "./../../addon/lib/pair_counter";
pair_counter_apply(AutomaticDictionary);

test('FreqSuffix', () => {
    var obj = new AutomaticDictionary.Lib.FreqSuffix({});
    obj.add("foo.com","X");
    obj.add("abc.com","X");
    obj.add("xyz.com","Y");

    expect(obj.get("xyz.com")).toBe("Y")
    expect(obj.get("com")).toBe("X")
    expect(obj.get("undefined.com",true) ).toBe("X")

    obj.add("a.foo.com","a");
    obj.add("b.foo.com","b");
    obj.add("c.foo.com","c");

    expect(obj.get("a.foo.com")).toBe("a")
    //Arbitrary first item
    expect(obj.get("foo.com")).toBe("X")

    //Update and win A at com
    obj.add("foo.com","A");
    obj.add("abc.com","A");
    obj.add("abc.com","A");
    expect(obj.get("com")).toBe("A")
    expect(obj.get("undef.com",true)).toBe("A")

    expect(obj.get("undefined-domain")).toBeUndefined()
    expect(obj.get("")).toBe("A")

    //unset values
    obj.remove("abc.com", "A");
    expect(obj.get("com")).toBe("A")
    obj.remove("abc.com", "A");
    expect(obj.get("com")).toBe("X")

    obj.remove("a.foo.com","a");
    expect(obj.get("a.foo.com")).toBe(null)

    //Remove unexsitent item
    obj.remove("a.foo.com","a");

    obj.remove("b.foo.com","b");
    obj.remove("c.foo.com","c");


    //Builder
    var obj2 = new AutomaticDictionary.Lib.FreqSuffix([
        ["a1.com","en"],
        ["a2.com","en"],
        ["a3.it","it"]
        ]);

    expect(obj2.get("a3.it")).toBe("it")
    expect(obj2.get("it")).toBe("it")
    expect(obj2.get("com")).toBe("en")

    //Serialize tests
    var str = obj2.toJSON();
    //reset obj2
    obj2 = new AutomaticDictionary.Lib.FreqSuffix();

    obj2.fromJSON(str);

    expect(obj2.get("a3.it")).toBe("it")
    expect(obj2.get("it")).toBe("it")
    expect(obj2.get("com")).toBe("en")

    obj2.add("foo.bar","foobar");
    expect(obj2.get("foo.bar")).toBe("foobar")
    expect(obj2.get("bar")).toBe("foobar")
});
