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
export function apply(AutomaticDictionary) {
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
}