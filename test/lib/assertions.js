//Assertion methods to use in your tests
assert = (function(){
    return {
        counters: { 
            assertions: 0,
            failures: 0
        },
        equal: function( expected, found ){
            this.counters.assertions++;
            if( expected != found ){
                this.counters.failures++;
                throw "Expected: "+ expected + "\nFound: "+found; 
            }
        },
        strictEqual: function( expected, found ){
            this.counters.assertions++;
            if( expected !== found ){
                this.counters.failures++;
                throw "Strict Expected: "+ expected + "\nFound: "+found;
            }
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
