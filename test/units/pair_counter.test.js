
import { apply } from "./../../addon/lib/pair_counter";

var AutomaticDictionary = { Lib: {} };
apply(AutomaticDictionary);


test('PairCounter', () => {
    //Test assignmentCounter structure
    var as = new AutomaticDictionary.Lib.PairCounter();

    as.add("a","b");
    as.add("a","b");
    as.add("xx","y");

    expect(as.getFreq("a","b")).toBe(2)
    expect(as.getFreq("xx","y")).toBe(1)
    expect(as.getFreq("xx","b")).toBe(0)

    var as2 = new AutomaticDictionary.Lib.PairCounter(
        as.pairsWithCounter());

    expect(as.getFreq("a","b")).toBe(2)
    expect(as.getFreq("xx","y")).toBe(1)
    expect(as.getFreq("xx","b")).toBe(0)

    as.remove("a","b");

    expect(as.getFreq("a","b")).toBe(1)
    expect(as.getFreq("xx","y")).toBe(1)
    expect(as.getFreq("xx","b")).toBe(0)
});