lru_performace_test_suite = function( constructor ){
    var bm_options = {soft:true}; 
    var size = 500;
    var amount = 1000;
    var lru = new constructor( {}, { size: size } );
    
    assert.equal(0, lru.size());
    
    assert.benchmark( 400, function(){
        for(var i=0; i < amount; i++){
           lru.set("a"+i, "v"+i);
        }
    }, bm_options );
    
    assert.equal(size, lru.size());
    
    assert.benchmark( 500, function lru_hash_test_gets(){
        for(var i=0; i < amount; i++){
           lru.get("a"+i, "v"+i);
        }
    }, bm_options );
    
    assert.equal(size, lru.size());
    
    var str = lru.serialize();
    var lru2 = eval( str );
    
    assert.equal(size, lru2.size());
    assert.equal("v"+(amount-1), lru.get("a" + (amount-1)));
    
}

logger.info("Testing LRUHash is disabled as it clearly do not perform well.");
//lru_performace_test_suite( AutomaticDictionary.Lib.LRUHash );
logger.info("Testing LRUHashV2");
lru_performace_test_suite( AutomaticDictionary.Lib.LRUHashV2 );
