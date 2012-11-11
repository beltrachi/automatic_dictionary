//Test assignmentCounter structure
var as = new AutomaticDictionary.Lib.PairCounter();

as.add("a","b");
as.add("a","b");
as.add("xx","y");

assert.equal(2,as.getFreq("a","b"));
assert.equal(1,as.getFreq("xx","y"));
assert.equal(0,as.getFreq("xx","b"));

var as2 = new AutomaticDictionary.Lib.PairCounter(
    as.pairsWithCounter());

assert.equal(2,as.getFreq("a","b"));
assert.equal(1,as.getFreq("xx","y"));
assert.equal(0,as.getFreq("xx","b"));

as.remove("a","b");

assert.equal(1,as.getFreq("a","b"));
assert.equal(1,as.getFreq("xx","y"));
assert.equal(0,as.getFreq("xx","b"));

