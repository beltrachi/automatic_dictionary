//Test SortedSet
logger.info("Testing SortedSet");

var bm_options = {soft:true}; 
    
var ss = AutomaticDictionary.Lib.SortedSet();

assert.benchmark( 500, function(){
    for(var i=0; i < 1000; i++){
       ss.push("a"+i);
    }
}, bm_options );

assert.equal(1000, ss.size());

