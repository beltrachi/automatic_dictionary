if(typeof(Tools) == "undefined"){ 
    Tools = {}; 
};

Tools.Logger = function(level){
    var levels = ["debug","performance","info","warn","error"];
    var log_level_idx=levels.indexOf(level);
    var is_current_level = function( curr ){
        return levels.indexOf( curr ) >= log_level_idx;
    }
    var _log = function( level, msg ){
        if( is_current_level( level ) )
            print("["+level+"]: " + msg);
    }
    return {
        debug: function(msg){
            _log( "debug", msg );
        },
        performance:  function(msg){
            _log( "performance", msg );
        },
        info:  function(msg){
            _log( "info", msg );
        },
        warn: function(msg){
            _log( "warn", msg );
        },
        error: function(msg){
            _log( "error", msg );
        },
        setLevel: function( level ){
            log_level_idx = levels.indexOf(level);
            if( log_level_idx === -1 ){
                throw "Wrong logger level: "+ level;
            }
        }
    };
};

Tools.printStackTrace = function(){
};

Tools.output = function(arr) {
  if( typeof( arr.length ) != undefined )
      arr = arr.join(' ');
      
  //Optput however you want
  print( arr );
};

