lru_performace_test_suite = function( constructor ){
    var bm_options = {soft:true}; 
    var lru = new constructor( {}, { size: 500 } );
    
    assert.equal(0, lru.size());
    
    assert.benchmark( 400, function(){
        for(var i=0; i < 1000; i++){
           lru.set("a"+i, "v"+i);
        }
    }, bm_options );
    
    assert.equal(500, lru.size());
    
    assert.benchmark( 500, function(){
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

logger.info("Testing LRUHash");
lru_performace_test_suite( AutomaticDictionary.Lib.LRUHash );
logger.info("Testing LRUHashV2");
lru_performace_test_suite( AutomaticDictionary.Lib.LRUHashV2 );
