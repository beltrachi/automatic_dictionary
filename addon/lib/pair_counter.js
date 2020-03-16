// An pair counter is a counter that takes into account how many times a 
// key has been related to a value. It's targeted to be O(1) on insert and update
// but O(n) on create.
// 
// @param assignments an array with [key,value,counter] or null
export function apply(AutomaticDictionary) {
AutomaticDictionary.Lib.PairCounter = function(assignments){
    this.data = {};
    assignments = assignments || [];
    var aux, i;
    for(i=0; i < assignments.length; i++){
        aux = assignments[i];
        this.set(aux[0],aux[1],aux[2]);
    }
};
AutomaticDictionary.Lib.PairCounter.prototype = {
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
            pair.push(f);
            out.push(pair);
        }
        return out;
    }
};
}
