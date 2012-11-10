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
 *  === Implementation
 *  
 *  It's implemented with a tree that on each node it stores the accumulated
 *  frequencies of each language.
 *  
 *  As we want the most frequent language, it keeps the languages sorted in
 *  descendant order so we get the first.
 *  
 *  FreqSuffix (is a tree)
 *      - root (TreeNode)
 *          - nodes (child nodes)
 *          - values (FreqTable is a double linked list mixed with a hash)
 *              - nodes
 *              - first
 *              - last
 *  
 *  Drawbacks:
 *      Building the structure is too slow. 1k inserts lasts 1 sec on tests
 *      
 *      
 *  === Store and load structure
 *  
 *  To save and retrieve this structure, we cannot extract it from the frequency
 *  tables, so we hace to store it aside.
 *  So we need a structure to store the adds in an array or something.
 *  
 *  With this data we'll be able to reconstruct the structure.
 *  
 *  it's a key => value times counter. To achieve that we can use a hack and
 *  serialize the hash as a string, and store an integer.    
 **/


AutomaticDictionary.Lib.FreqSuffix = function( values, options ){
    values = values || [];
    this.node_class = AutomaticDictionary.Lib.FreqSuffix.TreeNode;
    this.initialize( values, options );
}

AutomaticDictionary.Lib.FreqSuffix.prototype = {
    max_size: null,
    split_char: ".",
    values: {},
    
    initialize: function(values, options){
        this.options = options;
        this.root = new this.node_class("");
        this.root.nodes[""] = this.root;
        var tmp;
        if(values){
            for(var i = 0; i < values.length;i++){
                tmp = values[i];
                this.add(tmp[0], tmp[1]);
            }
        }
    },
    
    add: function(string, value){
        //logger.info(">>>>>>>>>> FreqSuffix add "+ string + " value: "+value);
        var parts = this.slice(string);
        this.root.add(parts, value);
    },
    remove: function(string, value){
        //logger.debug(">>>>>>>>>> FreqSuffix remove "+ string + " value: "+value);
        var parts = this.slice(string);
        this.root.remove(parts, value);
    },
    get: function(string){
        var parts = this.slice(string);
        return this.root.get(parts);
    },
    slice: function(str){
        return str.split(this.split_char).reverse();
    },
    toJSON: function(){
        return JSON.stringify(this.root.values(""));
    }
};
var fss = [];
AutomaticDictionary.Lib.FreqSuffix.TreeNode = function(key){
    //logger.debug("creating TreeNode with "+ key);
    fss.push(this);
    this.key = key;
    this.values = new AutomaticDictionary.Lib.FreqSuffix.FreqTable();
    this.nodes = {};
    this.node_type = AutomaticDictionary.Lib.FreqSuffix.TreeNode;
};
AutomaticDictionary.Lib.FreqSuffix.TreeNode.prototype = {
    // list is an array of prefix parts already splitted
    add: function(list, value){
        //logger.debug("TN add " + value + " at "+ list.toSource());
        this.navigateThrough(list, function(node){
            //logger.debug("TN adding value "+ value + " to "+ node.key);
            node.values.add(value);
        });
    },
    remove: function(list, value){
        //logger.debug("TN remove " + value + " at "+ list.toSource());
        this.navigateThrough(list, function(node){
            //logger.debug("TN remove value "+ value + " from "+ node.key);
            node.values.remove(value);
        });
    },
    get: function(list){
        var result;
        this.navigateTo(list, function(node){
            //logger.debug("found node on GET "+ node.toString());
            result = node.values.getFirst();
        });
        return result;
    },
    //Runs func on each node. Force create by default
    // Returns null when reaches a dead end (cannot walk to the leaf)
    navigateThrough: function(list, func, forceCreate){
        //logger.debug("TN navthrough "+ list.toSource());
        var node, 
            forced = (forceCreate !== false),
            item = list[0];
        if(list.length > 0 ){
            node = this.nodes[item];
            if( !node && forced ){
                node = new this.node_type(item);
                this.nodes[item] = node;
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
        //logger.debug("TN navto "+ list.toSource());
        //We know we reach leaf first so save it
        var leaf, reached = false;
        this.navigateThrough(list, function(node){
            if(!reached){
                reached = true;
                leaf = node;
            }
        }, false);
        //logger.debug("TN end of navto gives "+ leaf);
        //Notice we do not call func unless node found.
        if(leaf) func(leaf);
    },
    //Returns the values stored here.
    values:function(prefix){
        //TODO
        //SEMBLA QUE NO PUC SABER QUINS VALORS S'HAN AFEGIT A PARTIR DEL QUE TINC
        //Ja que si que podria extreure les fulles, epro si tinc
        // add("a.b", "v1")
        // add("b","v1"), no aquest ultim no va a les fulles, sino a un node intermig.
        // Caldrà guardar-ho enuna estructura auxiliar.
        return [];
    }
};
var fts = [];
AutomaticDictionary.Lib.FreqSuffix.FreqTable = function(){
    fts.push(this);
    //Nodes by key
    this.nodes = {};
    this.first = null; //Bigger counters / more freq
    this.last = null;
    this.node_type = AutomaticDictionary.Lib.FreqSuffix.FreqTableNode;
};

AutomaticDictionary.Lib.FreqSuffix.FreqTable.prototype = {
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
ftns = [];
//This is a priority queue
AutomaticDictionary.Lib.FreqSuffix.FreqTableNode = function(key, count){
    ftns.push(this);
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
        var p, aux, _this = this;
        this.count--;
        //Walk down and find lowerz
        p = this.walk("next",function(n){
            return ( n.count > _this.count || n == _this );
        });
        if( p && p != this && p.count <= this.count){
            //We moved!
            //Remove node from current and insert in p.next
            this.remove();
            p.insertBefore(this);
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

// An pair counter is a counter that takes into account how many times a 
// key has been related to a value. It's targeted to be O(1) on insert and update
// but O(n) on create.
// 
// @param assignments an array with [key,value,counter] or null
AutomaticDictionary.Lib.FreqSuffix.PairCounter = function(assignments){
    this.data = {};
    assignments = assignments || [];
    var aux, i;
    for(i=0; i < assignments.length; i++){
        aux = assignments[i];
        this.set(aux[0],aux[1],aux[2]);
    }
};
AutomaticDictionary.Lib.FreqSuffix.PairCounter.prototype = {
    data:{},
    add:function(key, value){
        var k = this.stringifyPair(key,value);
        this.data[k] = (this.data[k]||0)+1;
    },
    //To force the value of the freq.
    set: function(key,value,freq){
        var k = this.stringifyPair(key,value);
        this.data[k] = freq;
    },
    getFreq: function(key,value){
        var k = this.stringifyPair(key,value);
        return this.data[k] || 0;
    },
    remove:function(key, value){
        var k = this.stringifyPair(key,value);
        this.data[k] = ((this.data[k]||0))-1;
    },
    stringifyPair:function(a,b){
        return JSON.stringify([a,b]);
    },
    parsePair:function(s){
        return JSON.parse(s);
    },
    //Returns the array [k,v,counter] for each key-value pair
    pairsWithCounter:function(){
        var f, pair, out = [];
        
        for(var i in this.data){
            pair = this.parsePair(i);
            f = this.data[i];
            out.push(pair.push(f));
        }
    }
};

