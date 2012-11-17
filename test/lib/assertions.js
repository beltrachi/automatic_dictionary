//Assertion methods to use in your tests
assert = (function(){
    return {
        counters: { 
            assertions: 0,
            failures: 0
        },
        equal: function( expected, found, msg){
            this.counters.assertions++;
            if( expected != found ){
                this.counters.failures++;
                throw (msg || ("Expected: "+ expected + "\nFound: "+found)); 
            }
        },
        strictEqual: function( expected, found ){
            this.counters.assertions++;
            if( expected !== found ){
                this.counters.failures++;
                throw "Strict Expected: "+ expected + "\nFound: "+found;
            }
        },
        //"true" is a reserved word so...
        isTrue: function( found, msg ){
            this.equal(true, found, msg || "Is not true");
        },
        contains: function(needle, histack, msg){
            this.isTrue(
                (histack.indexOf(needle)!== -1),
                msg || ('String "' + histack+'" does not contain ' + needle) 
            );
        },
        equalJSON: function( expected, found, msg){
            this.equal(JSON.stringify(expected),JSON.stringify(found),msg);
        },
        // @param options can be the message string
        benchmark: function( milis, func, options ){
            var msg = null;
            var soft = false;
            if( options.toString() === options ){
                msg = options;
            }else{
                //Parse options
                soft = options && options.soft;
            }
            var start = Date.now();
            func();
            var elapsed = (Date.now() - start);
            this.counters.assertions++;
            logger.performance("Expected "+ milis + " | Lasted "+elapsed );
            if( elapsed > milis ){
                this.counters.failures++;
                var msg = "Benchmark failed: elapsed "+elapsed+" ms (max was "+milis+")"; 
                if( soft ){
                    logger.error(msg);
                }else{
                    Tools.printStackTrace();
                    throw msg;
                }
            }
        }
    };
})();
