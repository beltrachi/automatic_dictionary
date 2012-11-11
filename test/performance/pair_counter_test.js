var bm_options = {
    soft:true
}; 

var amount = 1000;

var obj = new AutomaticDictionary.Lib.PairCounter();
logger.info("PairCounter test with "+amount+" ops")
assert.benchmark( 150, function(){
    var k;
    for(var i=0; i < amount; i++){
        //10 diferent first items and 11 second items 
        obj.add("a"+(i%10),"b"+(i%11));
    }
}, bm_options );

assert.benchmark( 150, function(){
    var k;
    for(var i=0; i < amount; i++){
        //10 diferent first items and 11 second items 
        obj.remove("a"+(i%10),"b"+(i%11));
    }
}, bm_options );

