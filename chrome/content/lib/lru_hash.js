if( !AutomaticDictionary.Lib ) throw "AutomaticDictionary.Lib required";

// Hash that expires keys when they have not been used long time ago.
// As data it keeps a key/Value pair with additional info as "last_time_used"
// 
// So the interface is as a hash(set, get, delete), but the creation gives a size parameter that
// manages this attributes.
// 
/**
    LRUHash: Hash with max size and LRU expiration
    
    Interface:
    
        set( k, v ) => bool
        get( k, v ) => bool
        size( )  => int
        serialize( ) => string 
        load( string ) => void

LRUHash
 * Costs: all operations are O(n)
 * Size of the object is:
   k = average key size
   m = average value size
   n = size of the hash

   Size: k*n + (k+m)*n = (2k+m)*n  => O(n)
*/
AutomaticDictionary.Lib.LRUHash = function( hash, options ){
    options = options || {};
    this.initialize( hash, options );
}
AutomaticDictionary.Lib.LRUHash.prototype = {
    max_size: null,
    sorted_keys: [],
    hash: {},
    
    initialize: function( hash, options ){
        this.max_size = options.size || null;
        this.hash = hash || {};
        this.sorted_keys = [];
        for( k in this.hash ){
            this.sk_update_key( k );
        }
        if( options.sorted_keys ){
            for( pos in options.sorted_keys ){
                var key = options.sorted_keys[pos];
                if( typeof( this.hash[key] ) !== "undefined" ){
                    this.sk_update_key(key); 
                }
            }
        }
        this.logger = options["logger"];
    },
    //Defines or updates
    // O(n)
    set: function( key, value ){
        this.hash[key] = value;
        //Update keys
        this.sk_update_key( key );
        //Expire key if size reached
        if( this.max_size !== null && this.sorted_keys.length > this.max_size ){
            var key = this.sorted_keys[0];
            delete(this.hash[key]);
            this.sk_remove_key( key );
        }
    },
    // O(n)
    get: function( key ){
        //Update keys order
        if( this.hash[key] !== undefined ){
            this.sk_update_key( key );
        }
        return this.hash[key];
    },
    // O(n)
    sk_update_key: function(key){
        this.sk_remove_key( key );
        this.sorted_keys.push( key );
    },
    // O(n)
    sk_remove_key: function( key ){
        var idx = this.sorted_keys.indexOf( key );
        if( idx !== -1 ){
            //Remove element O(n)!! and indexOf can be O(n) too!
            var oldarr = this.sorted_keys;
            this.sorted_keys = new Array();
            for(var i=0; i< oldarr.length; i++ ){
                if( i !== idx ){
                    this.sorted_keys.push( oldarr[ i ] );
                }
            }
        }
    },
    // O(1)
    size: function(){
        return this.sorted_keys.length;
    },    
    // O(n)
    // Deprecated: we need an eval to recover it and eval is not safe Use toJSON instead
    serialize: function(){
        var out = this.hash.toSource();
        out += ",";
        out += { "sorted_keys": this.sorted_keys, "size": this.max_size }.toSource();
        return "new AutomaticDictionary.Lib.LRUHash(" + out + ")";
    },
    /* Retruns a JSON with data to recover the object 
     *       { 
     *          hash: ... , 
     *          options: {
     *              ...
     *          } 
     *       }
     */
    toJSON: function(){
        return JSON.stringify( { 
            hash: this.hash, 
            options: { 
                sorted_keys: this.sorted_keys, 
                size: this.max_size 
            } 
        } );
    },
   /*
    * Load data to an instance
    */
    fromJSON: function( data_string ){
        var json_data = JSON.parse( data_string );
        if( json_data ){
            this.initialize( json_data.hash, json_data.options )
        }
    }
}
