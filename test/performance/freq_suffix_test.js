var bm_options = {
    soft:true
}; 

var size = 500;
var amount = 1000;

//Profiler.profile_proto(AutomaticDictionary.Lib.FreqSuffix.FreqTableNode.prototype, "FTN");
//Profiler.profile_proto(AutomaticDictionary.Lib.FreqSuffix.FreqTable.prototype, "FT");
//Profiler.profile_proto(AutomaticDictionary.Lib.FreqSuffix.TreeNode.prototype, "TN");
//Profiler.profile_proto(AutomaticDictionary.Lib.FreqSuffix.prototype, "FS");



var obj = new AutomaticDictionary.Lib.FreqSuffix({})



//Realistic write!
// A distribution of very variable a, not so on b and less on c.
assert.benchmark( 400, function(){
    var k;
    for(var i=0; i < amount; i++){
        k = "b"+ (i%11) + ".c"+(i%10);
        if( i % 20 == 0) k = "a." + k;
        obj.add(k, "v"+(i%5));
    }
}, bm_options );
logger.info("profiler gives: " + Profiler.print_stats() );

//Read
assert.benchmark( 500, function(){
    var k;
    for(var i=0; i < amount; i++){
        k = "b"+ (i%100) + ".c"+(i%10);
        obj.get("v"+i);
    }
}, bm_options );
