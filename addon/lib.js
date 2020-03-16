export function apply ( AutomaticDictionary ) {
    AutomaticDictionary.Lib = {
        // Stub to call logger when not defined
        LoggerStub: {
            debug: function(){},
            performance: function(){},
            info: function(){},
            warn: function(){},
            error: function(){}
        }
    }
}
