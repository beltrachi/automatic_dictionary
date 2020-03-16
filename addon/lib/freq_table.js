export function apply(AutomaticDictionary){
AutomaticDictionary.Lib.FreqTable = function(){
    //Nodes by key
    this.nodes = {};
    this.first = null; //Bigger counters / more freq
    this.last = null;
    this.node_type = AutomaticDictionary.Lib.FreqTableNode;
};

AutomaticDictionary.Lib.FreqTable.prototype = {
    add:function(value){
        //logger.debug("Freq table BEFORE ADD IS "+this.printOrder());
        var node = this.nodes[value];
        if( !node ){
            //new node. Create and append bottom
            node = new this.node_type(value);
            this.nodes[value]=node;
            if( this.last ){
                this.last.next = node;
            }
            node.prev = this.last;
            this.last = node;
        }
        //increase node by one
        //logger.debug("Increasing node "+node.key);
        node.inc();
        if( !node.prev ){
            //logger.debug("Node gets first!");
            this.first = node;
        }
        if( !node.next ){
            //logger.debug("Node gets last!");
            this.last = node;
        }
        //logger.debug("Node added is "+ node.toString());
        //logger.debug("Freq table first is "+this.printOrder());
    },
    getFirst: function(){
        if( this.first )
            return this.first.key;
        else
            return null;
    },
    remove: function(value){
        //logger.debug("Freq table BEFORE REMOVE IS "+this.printOrder());
        var node = this.nodes[value], old_next, old_prev;
        if( node ){
            old_next = node.next;
            old_prev = node.prev;
            //logger.debug("olds are "+old_prev + " --- "+ old_next);
            node.dec();
            if( node.count == 0){
                //Remove node
                if( this.first == node){
                    //logger.debug("detected removing node so first is next "+ node.toString());
                    this.first = node.next;
                }
                if( this.last == node ){
                    this.last = node.prev;
                }
                //logger.debug("REMOVING --- EMPTY NODE "+node.key);
                node.remove();
                delete(this.nodes[value]);
            }else{
                if(this.first == node && node.prev != null){
                    //It's no longer the first
                    this.first = old_next;
                }
                if( this.last == node && node.next != null){
                    //Node is no longer last
                    this.last = old_prev;
                }
            }
        }
        //logger.debug("Node removed is "+ node);
        //logger.debug("Freq table first is "+this.printOrder());
    },
    printOrder: function(){
        var out = "", p = this.first;
        while( p ){
            out += " " + p.key + "("+ p.count + ")";
            p = p.next;
        }
        return out;
    },
    size: function(){
        var c = 0;
        for (var k in this.nodes) {
            c++;
        }
        return c;
    }
};
//This is a priority queue
AutomaticDictionary.Lib.FreqTableNode = function(key, count){
    this.count = count || 0;
    this.prev = null;
    this.next = null;
    this.key = key;
};

AutomaticDictionary.Lib.FreqTableNode.prototype = {
    //Increases counter and moves upward if necessary.
    inc: function(){
        var p, aux, _this = this;
        this.count ++;
        //Find the upper lower
        p = this.walk("prev",function(n){
            return (n.count < _this.count || n == _this);
        });

        //logger.debug("inc gets node "+ p);
        if( p && p.count < this.count){
            //We moved!
            //Remove node from current and insert in p.next
            this.remove();
            p.insertBefore(this);
        }
    },
    // decrement by one and move downwards if needed
    dec: function(){
        var p, _this = this;
        this.count--;
        //Walk down and find lower
        p = this.walk("next",function(n){
            return ( (n != this && n.count > _this.count) || n == _this );
        });
        if( p && p != this && p.count <= this.count){
            //Remove node from current and insert in p.next
            this.remove();
            p.insertBefore(this);
        }else{
            //If choosen node is last, we go after that
            if(p != this && p.next == null){
                //Move node to the end
                this.remove();
                p.insertAfter(this);
            }
        }
    },
    remove:function(){
        if( this.next ){
            this.next.prev = this.prev;
            this.next = null;
        }
        if( this.prev ){
            this.prev.next = this.next;
            this.prev = null;
        }        
    },
    //The node is setted before this (this.prev is node)
    insertBefore:function(node){
        if( this == node ) throw "Called insertBefore unanism"
        var aux = this.prev;
        this.prev = node;
        node.next = this;
        node.prev = aux;
        if( aux )
            aux.next = node;
    },
    //The node is setted after this (this.next is node)
    insertAfter:function(node){
        if( this == node ) throw "Called insertAfter unanism"
        var aux = this.next;
        this.next = node;
        node.prev = this;
        node.next = aux;
        if( aux )
            aux.prev = node;
    },
    toString:function(){
        return {
            key: this.key, 
            count:this.count, 
            next: this.next, 
            prev:this.prev
        }.toSource();
    },
    first:function(){
        return this.walk("prev",function(){return true;});
    },
    last:function(){
        return this.walk("next",function(){return true;});
    },
    // Walks while cond returns true
    // cond is a func that evals to true or false
    // dir is "next", "prev"
    walk: function( dir, cond ){
        var p = this;
        while( p && cond(p)){
            if( p[dir])
                p = p[dir];
            else
                break;
        }
        return p;
    }
}
}
