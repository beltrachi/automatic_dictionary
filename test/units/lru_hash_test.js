lru_test_suite = function( constructor ){
    var bm_options = {soft:true}; 
    var lru = new constructor( {}, { size: 3 } );

    lru.set("a",1);
    assert.equal(1,lru.get("a"));
    
    lru.set("b","test");
    lru.set("c","foo");
    
    assert.equal("test",lru.get("b"));
    assert.equal("foo",lru.get("c"));
    
    assert.equal(1,lru.get("a"));
    
    //Adding another replaces the oldest
    lru.set("d","ireplace");
    assert.strictEqual(undefined, lru.get("b"));
    assert.equal(1,lru.get("a"));
    assert.equal("foo",lru.get("c"));
    assert.equal("ireplace", lru.get("d"));
    
    //Setting an already setted value does not expire anything
    lru.set("c","foo");
    assert.equal(1,lru.get("a"));
    assert.equal("foo",lru.get("c"));
    assert.equal("ireplace", lru.get("d"));
    
    lru = new constructor( {}, { size: 500 } );
    assert.equal(0, lru.size());
    
    for(var i=0; i < 1000; i++){
       lru.set("a"+i, "v"+i);
    }
    
    assert.equal(500, lru.size());
    
    for(var i=0; i < 1000; i++){
       lru.get("a"+i, "v"+i);
    }
    
    assert.equal(500, lru.size());
    
    var str = lru.serialize();
    var lru2 = eval( str );
    
    assert.equal(500, lru2.size());
    assert.equal("v999", lru.get("a999"));
    
    // The a is the older and c is the newer so the a will be the next to expire
    lru = new constructor( { a : "1", b : 2, c : 3 }, { size : 3, sorted_keys: ["a","b","c"] });
    
    var data_string = lru.toJSON();
    lru2 = new constructor();
    
    lru2.fromJSON( data_string );
    
    assert.equal( lru.get("a"), lru2.get("a"));
    assert.equal( "1", lru2.get("a"));
    
    lru2.set("d","4");
    
    assert.equal( 3, lru2.size());

    assert.equal( "4", lru2.get("d"));
    // b is the last on usage.
    assert.equal( null, lru2.get("b"));
    
    //Test wrong keys
    lru = new constructor( { a : "1", b : 2, c : 3 }, 
    { 
        size : 3, 
        sorted_keys: ["a","c","z"],
        logger: logger
    });
    
    var arr = lru.sorted_keys;
    if( arr.toArray ) arr = arr.toArray();
    assert.equal( ["b", "a", "c"].toSource(), arr.toSource() );
}

//logger.info("Testing LRUHash");
//test_suite( AutomaticDilctionary.Lib.LRUHash );

logger.info("Disabled LRUHash test as it's slow and we only use V2");
//lru_test_suite( AutomaticDictionary.Lib.LRUHash );
logger.info("Testing LRUHashV2");
lru_test_suite( AutomaticDictionary.Lib.LRUHashV2 );

