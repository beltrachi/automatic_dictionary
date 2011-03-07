//Test linked list
logger.info("Testing LinkedList");
var ll = AutomaticDictionary.Lib.LinkedList();

ll.push("a");
ll.push("b");
ll.push("c");

assert.equal( "a", ll.first());
assert.equal( "a", ll.toArray()[0]);
assert.equal( "b", ll.toArray()[1]);
assert.equal( "c", ll.toArray()[2]);

ll.remove("b");
assert.equal( "a", ll.first());
assert.equal( false, ll.exists("b"));
assert.equal( "a", ll.toArray()[0]);
assert.equal( "c", ll.toArray()[1]);


assert.equal( "a", ll.toArray()[0]);
assert.equal( "c", ll.toArray()[1]);
assert.equal(2, ll.size());

ll.push("fooo");
assert.equal(true, ll.remove("fooo"));

assert.equal( "a", ll.first());
ll.remove("a");
ll.remove("a");
assert.equal( "c", ll.first());
assert.equal( 1, ll.size());

ll.push("b");
//Adding c removes old one
ll.push("c");
assert.equal( "b", ll.first());
assert.equal( 2, ll.size());
assert.equal( "b", ll.toArray()[0]);
assert.equal( "c", ll.toArray()[1]);

