
var obj = new AutomaticDictionary.Lib.FreqSuffix({});
obj.add("foo.com","X");
obj.add("abc.com","X");
obj.add("xyz.com","Y");

assert.equal("Y", obj.get("xyz.com"));
assert.equal("X", obj.get("com") );

obj.add("a.foo.com","a");
obj.add("b.foo.com","b");
obj.add("c.foo.com","c");

assert.equal("a", obj.get("a.foo.com"));
//Arbitrary first item
assert.equal("X", obj.get("foo.com"));

//Update and win A at com
obj.add("foo.com","A");
obj.add("abc.com","A");
obj.add("abc.com","A");
assert.equal("A", obj.get("com"));

assert.equal(null, obj.get("undefined-domain"));
assert.equal("A", obj.get(""));

//unset values
obj.remove("abc.com", "A");
assert.equal("A", obj.get("com"));
obj.remove("abc.com", "A");
assert.equal("X", obj.get("com"));

obj.remove("a.foo.com","a");
assert.equal(null, obj.get("a.foo.com"));

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

assert.equal("it",obj2.get("a3.it"));
assert.equal("it",obj2.get("it"));
assert.equal("en",obj2.get("com"));

//Test assignmentCounter structure
var as = new AutomaticDictionary.Lib.FreqSuffix.PairCounter();

as.add("a","b");
as.add("a","b");
as.add("xx","y");

assert.equal(2,as.getFreq("a","b"));
assert.equal(1,as.getFreq("xx","y"));
assert.equal(0,as.getFreq("xx","b"));

var as2 = new AutomaticDictionary.Lib.FreqSuffix.PairCounter(
    as.pairsWithCounter());

assert.equal(2,as.getFreq("a","b"));
assert.equal(1,as.getFreq("xx","y"));
assert.equal(0,as.getFreq("xx","b"));

as.remove("a","b");

assert.equal(1,as.getFreq("a","b"));
assert.equal(1,as.getFreq("xx","y"));
assert.equal(0,as.getFreq("xx","b"));



////Serialize tests
//var str = obj2.toJSON();
//
////reset obj2
//var obj2 = new AutomaticDictionary.Lib.FreqSuffix();
//
//obj3.fromJSON(str);
//
//assert.equal("it",obj2.get("a3.it"));
//assert.equal("it",obj2.get("it"));
//assert.equal("en",obj2.get("com"));
//
//obj2.set("foo.bar","foobar");
//assert.equal("foobar", obj2.get("foo.bar"));
//assert.equal("foobar", obj2.get("bar"));



