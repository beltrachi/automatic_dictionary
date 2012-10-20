if( !AutomaticDictionary.Lib ) throw "AutomaticDictionary.Lib required";
/*
 *  A FreqSuffix is a structure that can store a mapping of
 *  string => value
 *  
 *  and splits string into sufixes by a split char.
 *  
 *  The structure can be asked by a suffix of the string to know which value
 *  is more frequent.
 *  
 *  Example:
 *  
 *  obj = new AutomaticDictionary.Lib.FreqSuffix({})
 *  obj.set("foo.bar","X");
 *  obj.set("abc.bar","X");
 *  obj.set("xyz.bar","Y");
 *  
 *  obj.get("bar") 
 *  => "X"
 *  obj.get("xyz.bar") 
 *  => "Y"
 *  
 *  
 *  
 **/


AutomaticDictionary.Lib.FreqSuffix = function( hash, options ){
    hash = hash || {};
    this.node_class = AutomaticDictionary.Lib.FreqSuffix.TreeNode;
    this.initialize( hash, options );
}

AutomaticDictionary.Lib.FreqSuffix.prototype = {
    max_size: null,
    split_char: ".",
    
    
    initialize: function(hash, options){
        this.options = options;
        this.root = new this.node_class("");
        this.root.nodes[""] = this.root;
    },
    
    add: function(string, value){
        logger.debug(">>>>>>>>>> FreqSuffix add "+ string + " value: "+value);
        var parts = this.slice(string);
        this.root.add(parts, value);
    },
    remove: function(string, value){
        logger.debug(">>>>>>>>>> FreqSuffix remove "+ string + " value: "+value);
        var parts = this.slice(string);
        this.root.remove(parts, value);
    },
    get: function(string){
        var parts = this.slice(string);
        return this.root.get(parts);
    },
    slice: function(str){
        return str.split(this.split_char).reverse();
    }
};

AutomaticDictionary.Lib.FreqSuffix.TreeNode = function(key){
    logger.debug("creating TreeNode with "+ key);
    this.key = key;
    this.values = new AutomaticDictionary.Lib.FreqSuffix.FreqTable();
    this.nodes = {};
    this.node_type = AutomaticDictionary.Lib.FreqSuffix.TreeNode;
};
AutomaticDictionary.Lib.FreqSuffix.TreeNode.prototype = {
    // list is an array of prefix parts already splitted
    add: function(list, value){
        logger.debug("TN add " + value + " at "+ list.toSource());
        this.navigateThrough(list, function(node){
            logger.debug("TN adding value "+ value + " to "+ node.key);
            node.values.add(value);
        });
    },
    remove: function(list, value){
        logger.debug("TN remove " + value + " at "+ list.toSource());
        this.navigateThrough(list, function(node){
            logger.debug("TN remove value "+ value + " from "+ node.key);
            node.values.remove(value);
        });
    },
    get: function(list){
        var result;
        this.navigateTo(list, function(node){
            logger.debug("found node on GET "+ node.toString());
            result = node.values.getFirst();
        });
        return result;
    },
    //Runs func on each node. Force create by default
    // Returns null when reaches a dead end (cannot walk to the leaf)
    navigateThrough: function(list, func, forceCreate){
        logger.debug("TN navthrough "+ list.toSource());
        var node, forced = (forceCreate !== false);
        if(list.length > 0 ){
            node = this.nodes[list[0]];
            if( !node && forced ){
                node = new this.node_type(list[0]);
                this.nodes[list[0]] = node;
            }
            if( node ){
                list.shift();
                node.navigateThrough(list, func, forced);
            }else{
                //node not found, so what?
                func(null);
            }
        }
        func(this);
    },
    navigateTo: function( list, func){
        logger.debug("TN navto "+ list.toSource());
        //We know we reach leaf first so save it
        var leaf;
        this.navigateThrough(list, function(node){
            if( node === null ){
                //No node there so we return null
                leaf = null;
            }
            if( !leaf && leaf !== null && node ) leaf = node;
        }, false);
        logger.debug("TN end of navto gives "+ leaf);
        //Notice we do not call func unless node found.
        if(leaf) func(leaf);
    }
};

AutomaticDictionary.Lib.FreqSuffix.FreqTable = function(){
    //Nodes by key
    this.nodes = {};
    this.first = null; //Bigger counters / more freq
    this.last = null;
    this.node_type = AutomaticDictionary.Lib.FreqSuffix.FreqTableNode;
};

AutomaticDictionary.Lib.FreqSuffix.FreqTable.prototype = {
    add:function(value){
        logger.debug("Freq table BEFORE ADD IS "+this.printOrder());
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
        logger.debug("Increasing node "+node.key);
        node.inc();
        if( !node.prev ){
            logger.debug("Node gets first!");
            this.first = node;
        }
        if( !node.next ){
            logger.debug("Node gets last!");
            this.last = node;
        }
        logger.debug("Node added is "+ node.toString());
        logger.debug("Freq table first is "+this.printOrder());
    },
    getFirst: function(){
        if( this.first )
            return this.first.key;
    },
    remove: function(value){
        logger.debug("Freq table BEFORE REMOVE IS "+this.printOrder());
        var node = this.nodes[value], old_next, old_prev;
        if( node ){
            old_next = node.next;
            old_prev = node.prev;
            logger.debug("olds are "+old_prev + " --- "+ old_next);
            node.dec();
            if( node.count == 0){
                //Remove node
                if( this.first == node){
                    logger.debug("detected removing node so first is next "+ node.toString());
                    this.first = node.next;
                }
                if( this.last == node ){
                    this.last = node.prev;
                }
                logger.debug("REMOVING --- EMPTY NODE "+node.key);
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
        logger.debug("Node removed is "+ node);
        logger.debug("Freq table first is "+this.printOrder());
    },
    printOrder: function(){
        var out = "", p = this.first;
        while( p ){
            out += " " + p.key + "("+ p.count + ")";
            p = p.next;
        }
        return out;
    }
};

//This is a priority queue
AutomaticDictionary.Lib.FreqSuffix.FreqTableNode = function(key, count){
    this.count = count || 0;
    this.prev = null;
    this.next = null;
    this.key = key;
};

AutomaticDictionary.Lib.FreqSuffix.FreqTableNode.prototype = {
    //Increases counter and moves upward if necessary.
    inc: function(){
        var p, aux, _this = this;
        this.count ++;
        //Find the upper lower
        p = this.walk("prev",function(n){
            return (n == _this || n.count < _this.count);
        });

        logger.debug("inc gets node "+ p);
        if( p && p.count < this.count){
            //We moved!
            //Remove node from current and insert in p.next
            this.remove();
            p.insertBefore(this);
        }
    },
    // decrement by one and move downwards if needed
    dec: function(){
        var p, aux, _this = this;
        this.count--;
        //Walk down and find lowerz
        p = this.walk("next",function(n){
            return (n == _this || n.count > _this.count );
        });
        if( p && p != this && p.count <= this.count){
            //We moved!
            //Remove node from current and insert in p.next
            this.remove();
            p.insertBefore(this);
        }
    },
    remove:function(){
        if( this.next ) this.next.prev = this.prev;
        if( this.prev ) this.prev.next = this.next;
        this.prev = null;
        this.next = null;
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
