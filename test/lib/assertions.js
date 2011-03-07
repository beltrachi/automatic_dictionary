//Assertion methods to use in your tests
assert = (function(){
    return {
        counter: 0,
        equal: function( expected, found ){
            this.counter++;
            if( expected != found ){
                Tools.printStackTrace();
                throw "Expected: "+ expected + "\nFound: "+found;wd
            }
        },
        strictEqual: function( expected, found ){
            this.counter++;
            if( expected !== found ){
                Tools.printStackTrace();
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
            this.counter++;
            logger.performance("Expected "+ milis + " | Lasted "+elapsed );
            if( elapsed > milis ){
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
