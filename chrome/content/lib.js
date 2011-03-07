// Hash that expires keys when they have not been used long time ago.
// As data it keeps a key/Value pair with additional info as "last_time_used"
// 
// So the interface is as a hash(set, get, delete), but the creation gives a size parameter that
// manages this attributes.
// 
/**
    @param int size nil when no limit setted
 */

if(typeof(AutomaticDictionary) === "undefined" ){
    var AutomaticDictionary = {}; 
}

AutomaticDictionary.Lib = {}

AutomaticDictionary.Lib.LRUHash = function( hash, options ){
    options = options || {}; 
    this.max_size = options.size || null;
    this.sorted_keys = options["sorted_keys"] ||[]; // Its an array with the keys ordered. Oldest first!
    this.hash = hash;
}
AutomaticDictionary.Lib.LRUHash.prototype = {
    max_size: null,
    sorted_keys: [],
    hash: {},
    
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
    size: function(){
        return this.sorted_keys.length;
    }

}

/*
    Implement the sorted_keys by a linked list and test it!
*/
AutomaticDictionary.Lib.LinkedList = function(){
    var num_nodes = 0;
    var first = null;
    var last = null;
    var nodes = {};
    return {
        exists: function( elem ){
            return nodes[ elem ] != undefined;
        },
        first: function(){
            if( first ){
                return first.v;
            }
            return null;
        },
        push: function( elem ){
            if( this.exists( elem ) ){
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
        size: function(){
            return num_nodes;
        },
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
        },
    }
}

//IMPLEMENT second version

AutomaticDictionary.Lib.LRUHashV2 = function( hash, options ){
    options = options || {}; 
    this.max_size = options.size || null;
    this.sorted_keys = AutomaticDictionary.Lib.LinkedList();
    var key_base = hash;
    if( options["sorted_keys"] ){
        key_base = options["sorted_keys"];
    }
    //Iterate over hash
    for( var idx in key_base ){
        this.sorted_keys.push( hash[idx] );
    }
    
    this.hash = hash;
}

AutomaticDictionary.Lib.LRUHashV2.prototype = {
    max_size: null,
    sorted_keys: null,
    hash: {},
    
    //Defines or updates
    // O(n)
    set: function( key, value ){
        logger.debug("Set "+key );
        //Update keys
        this.sk_update_key( key );
        //Expire key if size reached
//        logger.debug("Should expire? max="+this.max_size+" size="+this.size());
        if( this.max_size !== null && this.size() > this.max_size ){
            var key_to_expire = this.sorted_keys.first();
            logger.debug("expiring key "+key_to_expire);
            delete(this.hash[key_to_expire]);
            this.sk_remove_key( key_to_expire );
        }
//        logger.debug("sorted_keys is "+this.sorted_keys.toArray());
//        logger.debug("sorted_keys SIZE is "+ this.sorted_keys.size());
        this.hash[key] = value;
    },
    // O(n)
    get: function( key ){
        logger.debug("Get "+key );
        //Update keys order
        if( this.hash[key] !== undefined ){
            logger.debug("on a get we get "+this.hash[key]);
            this.sk_update_key( key );
        }
        return this.hash[key];
    },
    // O(n)
    sk_update_key: function(key){
        logger.debug("updating usage of "+key);
        this.sk_remove_key( key );
        this.sorted_keys.push( key );
    },
    // O(n)
    sk_remove_key: function( key ){
        this.sorted_keys.remove( key );
    },
    size: function(){
        if( !this.sorted_keys.foo)
            this.sorted_keys.foo ="bar"+Math.floor(Math.random()*99999);
        logger.debug("SIZE sorted keys is " + this.sorted_keys.foo );
        return this.sorted_keys.size();
    }
}

