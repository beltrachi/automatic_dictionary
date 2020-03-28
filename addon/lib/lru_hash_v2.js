
export function apply(AutomaticDictionary) {
  AutomaticDictionary.Lib.LRUHashV2 = function( hash, options ){
    hash = hash || {};
    this.initialize( hash, options );
  }

  AutomaticDictionary.Lib.LRUHashV2.prototype = {
    max_size: null,
    sorted_keys: null,
    hash: {},
    expiration_callback: null,

    //Initializes data with them.
    initialize: function( hash, options ){
      this.logger = (options && options["logger"]) || AutomaticDictionary.Lib.LoggerStub;
      options = options || {};
      this.max_size = options.size || null;
      this.sorted_keys = AutomaticDictionary.Lib.SortedSet();
      var key_base = [];
      if( options["sorted_keys"] ){
        key_base = options["sorted_keys"];
      }
      //Iterate over hash
      for( var idx in hash ){
        this.sorted_keys.push( idx );
      }
      //Insert the sorted keys to force the order
      var key = null;
      for( var idx in key_base ){
        key = key_base[idx];
        if( typeof(hash[key]) !== "undefined" ){
          this.sorted_keys.push( key );
        }
      }
      this.hash = hash;
    },
    //Defines or updates
    // O(n)
    set: function( key, value ){
      this.logger.debug("Set "+key );
      //Update keys
      this.sk_update_key( key );
      this.hash[key] = value;
      //Expire key if size reached
      if( this.max_size !== null && this.size() > this.max_size ){
        var key_to_expire = this.sorted_keys.first(),
            value_to_expire = this.hash[key_to_expire];

        this.logger.debug("expiring key "+key_to_expire);
        delete(this.hash[key_to_expire]);
        this.sk_remove_key( key_to_expire );
        if(this.expiration_callback){
          this.expiration_callback([key_to_expire,value_to_expire]);
        }
      }
    },
    // O(n)
    get: function( key ){
      this.logger.debug("Get "+key );
      //Update keys order
      if( this.hash[key] !== undefined ){
        this.logger.debug("on a get we get "+this.hash[key]);
        this.sk_update_key( key );
      }
      return this.hash[key];
    },
    keys: function(){
      return this.sorted_keys.toArray();
    },
    // O(n)
    sk_update_key: function(key){
      this.logger.debug("updating usage of "+key);
      this.sk_remove_key( key );
      this.sorted_keys.push( key );
    },
    // O(n)
    sk_remove_key: function( key ){
      this.sorted_keys.remove( key );
    },
    // O(1)
    size: function(){
      return this.sorted_keys.size();
    },
    // O(n)
    // Deprecated: we need an eval to recover it and eval is not safe Use toJSON instead
    serialize: function(){
      var out = this.hash.toSource();
      out += ",";
      out += { "sorted_keys": this.sorted_keys.toArray(), "size": this.max_size }.toSource();
      return "new AutomaticDictionary.Lib.LRUHashV2(" + out + ")";
    },
    /* Retruns a JSON with data to recover the object
     *       {
     *          hash: ... ,
     *           options: {
     *           }
     *       }
     */
    toJSON: function(){
      return JSON.stringify( {
        hash: this.hash,
        options: {
          sorted_keys: this.sorted_keys.toArray(),
          size: this.max_size
        }
      } );
    },
    /*
     * Load data to an instance
     */
    fromJSON: function( data_string ){
      var json_data = JSON.parse( data_string );
      if( typeof(json_data) == "string" ){
        // Double encondign??
        this.logger.warn("Removing double encodning")
        json_data = JSON.parse(json_data);
      }
      if( json_data ){
        var options = json_data.options;
        // Keep logger
        options.logger = this.logger;
        this.initialize( json_data.hash, options )
      }
    }
  }
}