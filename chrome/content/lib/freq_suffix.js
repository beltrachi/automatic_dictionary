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
    },
    
    add: function(string, value){
        logger.debug(">>>>>>>>>> FreqSuffix add "+ string + " value: "+value);
        var parts = string.split(this.split_char).reverse();
        this.root.add(parts, value);
    },
    remove: function(string, value){
        throw "TODO";
    },
    get: function(string){
        var parts = string.split(this.split_char).reverse();
        return this.root.get(parts);
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
        throw "TODO";
    },
    //
    get: function(list){
        var result;
        this.navigateTo(list, function(node){
            logger.debug("found node on GET "+ node.toString());
            result = node.values.getFirst();
        });
        return result;
    },
    //Runs func on each node. Force create by default
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
            }
        }
        func(this);
    },
    navigateTo: function( list, func){
        logger.debug("TN navto "+ list.toSource());
        //We know we reach leave first so save it
        var leave = null;
        this.navigateThrough(list, function(node){
            if( !leave ) leave = node;
        }, false);
        logger.debug("TN end of navto gives "+ leave.toString());
        if(leave) func(leave);
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
        throw "TODO remove";
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

AutomaticDictionary.Lib.FreqSuffix.FreqTableNode = function(key, count){
    this.count = count || 0;
    this.prev = null;
    this.next = null;
    this.key = key;
};

AutomaticDictionary.Lib.FreqSuffix.FreqTableNode.prototype = {
    //Increases counter and moves upward if necessary.
    inc: function(){
        var p = this.prev, aux;
        this.count ++;
        //Find the upper lower
        while( p && p.count < this.count){
            if( p.prev)
                p = p.prev;
            else
                break;
        }
        logger.debug("inc gets node "+ p);
        if( p && p.count < this.count){
            //We moved!
            //Remove node from current and insert in p.next
            this.remove();
            p.insertBefore(this);
        }
    },
    remove:function(){
        if( this.next ) this.next.prev = this.prev;
        if( this.prev ) this.prev.next = this.next;
            
    },
    //The node is setted before this (this.prev is node)
    insertBefore:function(node){
        var aux = this.prev;
        this.prev = node;
        node.next = this;
        node.prev = aux;
        if( aux )
            aux.next = node;
    },
    toString:function(){
        return {key: this.key, count:this.count, next: this.next, prev:this.prev}.toSource();
    }
}
