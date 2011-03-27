//Test SortedSet
logger.info("Testing SortedSet");
var ss = AutomaticDictionary.Lib.SortedSet();

ss.push("a");
ss.push("b");
ss.push("c");

assert.equal( "a", ss.first());
assert.equal( "a", ss.toArray()[0]);
assert.equal( "b", ss.toArray()[1]);
assert.equal( "c", ss.toArray()[2]);

ss.remove("b");
assert.equal( "a", ss.first());
assert.equal( false, ss.contains("b"));
assert.equal( "a", ss.toArray()[0]);
assert.equal( "c", ss.toArray()[1]);


assert.equal( "a", ss.toArray()[0]);
assert.equal( "c", ss.toArray()[1]);
assert.equal(2, ss.size());

ss.push("fooo");
assert.equal(true, ss.remove("fooo"));

assert.equal( "a", ss.first());
ss.remove("a");
ss.remove("a");
assert.equal( "c", ss.first());
assert.equal( 1, ss.size());

ss.push("b");
//Adding c removes old one
ss.push("c");
assert.equal( "b", ss.first());
assert.equal( 2, ss.size());
assert.equal( "b", ss.toArray()[0]);
assert.equal( "c", ss.toArray()[1]);

