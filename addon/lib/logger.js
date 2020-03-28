export function apply(AutomaticDictionary){
  AutomaticDictionary.Lib.Logger = function(level, writer_fn){
    var levels = ["debug","performance","info","warn","error"];
    var log_level_idx = levels.indexOf(level);
    var is_current_level = function( curr ){
      return levels.indexOf( curr ) >= log_level_idx;
    }
    var filters = [];
    return {
      filters: filters,
      log: function(level, msg) {
        if( is_current_level( level ) ) {
          if (typeof(msg) == 'function'){
            msg = msg();
          }else if(typeof(msg) === 'undefined'){
            msg = '(undefined)';
          }else{
            msg = JSON.stringify(msg);
          }
          msg = this.filter(msg);
          if(msg){
            msg = (new Date()).toJSON() + " ["+level+"] " + msg;
            this.write(msg);
          }
        }
      },
      // Writes to output
      write: function( msg, details ){
        writer_fn(msg);
      },
      // Applies current filters to msg
      filter: function( msg ){
        for( var i = 0; i < this.filters.length; i++){
          msg = this.filters[i](msg);
        }
        return msg;
      },
      addFilter: function( fn ){
        this.filters.push(fn);
      },
      debug: function(msg){
        this.log( "debug", msg );
      },
      performance:  function(msg){
        this.log( "performance", msg );
      },
      info:  function(msg){
        this.log( "info", msg );
      },
      warn: function(msg){
        this.log( "warn", msg );
      },
      error: function(msg){
        this.log( "error", msg );
      },
      setLevel: function( level ){
        log_level_idx = levels.indexOf(level);
        if( log_level_idx === -1 ){
          throw "Wrong logger level: "+ level;
        }
      },
      getLevel: function(){
        return levels[log_level_idx];
      }
    };
  };

  /*
    new LoggerObfuscator( /abc/, function(dict, function(){
    return "******";
    });

  */
  AutomaticDictionary.Lib.LoggerObfuscator = function(regexp, replace_fn){
    var dict = {}

    var fn = function(match) {
      //Search for it or get a new one.
      if (!dict[match]){
        dict[match] = replace_fn.apply(this,arguments);
      }
      return dict[match]
    };

    return function(msg){
      //Filter private data
      var _this = this;
      return msg.replace(regexp , fn);
    };
  }

  AutomaticDictionary.Lib.NullLogger = function(){
    var null_fn = function(){};
    return {
      log: null_fn,
      debug: null_fn,
      performance: null_fn,
      info: null_fn,
      warn: null_fn,
      error: null_fn
    };
  }
}