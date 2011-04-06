// Hash that expires keys when they have not been used long time ago.
// As data it keeps a key/Value pair with additional info as "last_time_used"
// 
// So the interface is as a hash(set, get, delete), but the creation gives a size parameter that
// manages this attributes.
// 
if(typeof(AutomaticDictionary) === "undefined" ){
    var AutomaticDictionary = {}; 
}

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
        this.sorted_keys = options["sorted_keys"] ||[]; // Its an array with the keys ordered. Oldest first!
        this.hash = hash || {};
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

/*

SortedSet

    As a set, has no repeated values and stores the order in which they were
    added

    Interface
        
        add( v ) => bool
            The last() will be v since now
        contains( v ) => bool
        size() => int
        remove( v ) => bool
        toArray() => array
        first() => element
        last() => element

    Costs:
        * All operations are O(logn) or better, except toArray O(n)
*/
AutomaticDictionary.Lib.SortedSet = function( options ){
    options = options || {};
    var num_nodes = 0;
    var first = null;
    var last = null;
    var nodes = {};
    var logger = options["logger"] || AutomaticDictionary.Lib.LoggerStub;
    return {
        // O(logn)
        contains: function( elem ){
            return nodes[ elem ] != undefined;
        },
        // O(1)
        first: function(){
            if( first ){
                return first.v;
            }
            return null;
        },
        // O(logn)
        push: function( elem ){
            if( this.contains( elem ) ){
                this.remove(elem);
            }
            var node = {p: null, n:null,v:elem};
            nodes[ elem ] = node;
            num_nodes++;
            logger.debug("LL: incrementing num_nodes: "+num_nodes);
            if( !first ){
                first = node;
            }
            if( !last ){
                last = node;
            }else{
                //We add this to the last.
                last.n = node;
                node.p = last;
                last = node;
            }
        },
        // O(1)
        size: function(){
            return num_nodes;
        },
        // O(n)
        toArray: function(){
            var curr = first;
            var res = [];
            while( curr ){
                res.push( curr.v );
                curr = curr.n;
            }
            return res;
        },
        // @return boolean element already existed
        // O(logn)
        remove: function(elem){
            var node = nodes[ elem ];
            //unlink
            if( node === undefined ) return false;
            num_nodes--;
            logger.debug("LL: dec num_nodes: "+num_nodes);
            if( node === last ){
                last = last.p;
            }
            if( node === first ){
                first = first.n;
            }
            if( node.p ){
                node.p.n = node.n;
            }
            if( node.n ){
                node.n.p = node.p;
            }
            delete( nodes[elem] );
            return true;
        }
    }
}

//IMPLEMENT second version using the sorted set

AutomaticDictionary.Lib.LRUHashV2 = function( hash, options ){
    hash = hash || {};
    this.initialize( hash, options );
}

AutomaticDictionary.Lib.LRUHashV2.prototype = {
    max_size: null,
    sorted_keys: null,
    hash: {},
    
    //Initializes data with them.
    initialize: function( hash, options ){
        options = options || {}; 
        this.max_size = options.size || null;
        this.sorted_keys = AutomaticDictionary.Lib.SortedSet();
        var key_base = hash;
        if( options["sorted_keys"] ){
            key_base = options["sorted_keys"];
        }
        //Iterate over hash
        for( var idx in key_base ){
            this.sorted_keys.push( key_base[idx] );
        }
        
        this.hash = hash;
        this.logger = options["logger"] || AutomaticDictionary.Lib.LoggerStub;
    },
    //Defines or updates
    // O(n)
    set: function( key, value ){
        this.logger.debug("Set "+key );
        //Update keys
        this.sk_update_key( key );
        //Expire key if size reached
        if( this.max_size !== null && this.size() > this.max_size ){
            var key_to_expire = this.sorted_keys.first();
            this.logger.debug("expiring key "+key_to_expire);
            delete(this.hash[key_to_expire]);
            this.sk_remove_key( key_to_expire );
        }
        this.hash[key] = value;
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
        if( json_data ){
            this.initialize( json_data.hash, json_data.options )
        }
    }

}

