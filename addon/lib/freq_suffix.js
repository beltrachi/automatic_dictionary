export function apply(AutomaticDictionary) {
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
 *  To save and retrieve this structure, we cannot extract it easily from the 
 *  frequency tables, so we hace to store it aside.
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
    pair_counter: null,

    initialize: function(values, options){
      this.options = options;
      this.root = new this.node_class("");
      this.root.nodes[""] = this.root;
      this.pair_counter = new AutomaticDictionary.Lib.PairCounter();
      var tmp;
      if(values){
        for(var i = 0; i < values.length;i++){
          tmp = values[i];
          this.add(tmp[0], tmp[1]);
        }
      }
    },

    add: function(string, value){
      var parts = this.slice(string);
      this.root.add(parts, value);
      this.pair_counter.add(string,value);
    },
    remove: function(string, value){
      var parts = this.slice(string);
      this.root.remove(parts, value);
      this.pair_counter.remove(string,value);
    },
    // @param deep: (optional) search by suffix when true.
    get: function(string, deep){
      deep = (deep === true); //False by default.
      var parts = this.slice(string), res = null;
      while( parts.length > 0 ){
        res = this.root.get(parts.slice(0)); //slice trick to clone the array
        if(res || !deep){ //When not deep, return first result.
          return res;
        }else{
          parts.pop();
        }
      }
      return res;
    },
    slice: function(str){
      return str.split(this.split_char).reverse();
    },
    toJSON: function(){
      return JSON.stringify(this.pair_counter.pairsWithCounter());
    },
    fromJSON: function(pairs_with_counter){
      pairs_with_counter = JSON.parse(pairs_with_counter);
      if (typeof(pairs_with_counter) == "string"){
        pairs_with_counter = JSON.parse(pairs_with_counter);
      }
      this.initialize();
      var i, j, value;
      for(i=0; i < pairs_with_counter.length;i++){
        value = pairs_with_counter[i];
        for(j=0;j<value[2];j++){
          this.add(value[0],value[1]);
        }
      }
    },
    //Return an array of arrays with [key,value,counter]
    pairs:function(){
      return this.pair_counter.pairsWithCounter();
    }
  };
  AutomaticDictionary.Lib.FreqSuffix.TreeNode = function(key){
    this.key = key;
    this.values = new AutomaticDictionary.Lib.FreqTable();
    this.nodes = {};
    this.node_type = AutomaticDictionary.Lib.FreqSuffix.TreeNode;
  };
  AutomaticDictionary.Lib.FreqSuffix.TreeNode.prototype = {
    // list is an array of prefix parts already splitted
    add: function(list, value){
      this.navigateThrough(list, function(node){
        node.values.add(value);
      });
    },
    remove: function(list, value){
      this.navigateThrough(list, function(node){
        node.values.remove(value);
      });
    },
    get: function(list){
      var result;
      this.navigateTo(list, function(node){
        result = node.values.getFirst();
      });
      return result;
    },
    //Runs func on each node. Force create by default
    // Returns null when reaches a dead end (cannot walk to the leaf)
    navigateThrough: function(list, func, forceCreate){
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
      //We know we reach leaf first so save it
      var leaf, reached = false;
      this.navigateThrough(list, function(node){
        if(!reached){
          reached = true;
          leaf = node;
        }
      }, false);
      //Notice we do not call func unless node found.
      if(leaf) func(leaf);
    }
  };
}