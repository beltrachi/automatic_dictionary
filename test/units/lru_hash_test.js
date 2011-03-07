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
    
    assert.benchmark( 400, function(){
        for(var i=0; i < 1000; i++){
           lru.set("a"+i, "v"+i);
        }
    }, bm_options );
    
    assert.equal(500, lru.size());
    
    assert.benchmark( 200, function(){
        for(var i=0; i < 1000; i++){
           lru.get("a"+i, "v"+i);
        }
    }, bm_options );
    
    assert.equal(500, lru.size());
    
    var str = lru.serialize();
    var lru2 = eval( str );
    
    assert.equal(500, lru2.size());
    assert.equal("v999", lru.get("a999"));
}

//logger.info("Testing LRUHash");
//test_suite( AutomaticDictionary.Lib.LRUHash );

logger.info("Testing LRUHash");
lru_test_suite( AutomaticDictionary.Lib.LRUHash );
logger.info("Testing LRUHashV2");
lru_test_suite( AutomaticDictionary.Lib.LRUHashV2 );
