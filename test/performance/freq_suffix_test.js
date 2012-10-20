var bm_options = {soft:true}; 

var size = 500;
var amount = 1000;
var obj = new AutomaticDictionary.Lib.FreqSuffix({})

//Realistic write!
// A distribution of very variable a, not so on b and less on c.
assert.benchmark( 400, function(){
    var k;
    for(var i=0; i < amount; i++){
        k = "b"+ (i%100) + ".c"+(i%10);
        if( i % 20 == 0) k = "a." + k;
        obj.add(k, "v"+(i%10));
    }
}, bm_options );

assert.equal("v1", obj.get("b1.c1"));

//Read
assert.benchmark( 500, function(){
    var k;
    for(var i=0; i < amount; i++){
        k = "b"+ (i%100) + ".c"+(i%10);
        obj.get(k, "v"+i);
    }
}, bm_options );
    
