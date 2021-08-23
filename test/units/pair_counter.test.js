
import { PairCounter } from "./../../addon/lib/pair_counter";

test('PairCounter', () => {
    //Test assignmentCounter structure
    var as = new PairCounter();

    as.add("a", "b");
    as.add("a", "b");
    as.add("xx", "y");

    expect(as.getFreq("a", "b")).toBe(2)
    expect(as.getFreq("xx", "y")).toBe(1)
    expect(as.getFreq("xx", "b")).toBe(0)

    var as2 = new PairCounter(
        as.pairsWithCounter());

    expect(as.getFreq("a", "b")).toBe(2)
    expect(as.getFreq("xx", "y")).toBe(1)
    expect(as.getFreq("xx", "b")).toBe(0)

    as.remove("a", "b");

    expect(as.getFreq("a", "b")).toBe(1)
    expect(as.getFreq("xx", "y")).toBe(1)
    expect(as.getFreq("xx", "b")).toBe(0)
});