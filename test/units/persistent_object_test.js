//Test it stores and loads the object...
var store_object = Tools.StoreObjectStub();

//A silly hash whith serializable methods
var SerializableThing = (function(){
    var data = {};
    
    return {
        set: function(k,v){
            logger.debug("called SET with "+k + " and value "+ v);
            data[k] = v;
        },
        get: function(k){
            logger.debug("called SET with "+k);
            return data[k];
        },
        toJSON: function(){
            return JSON.stringify(data);
        },
        fromJSON: function( str ){
            logger.debug("from json recieves "+ str);
            data = JSON.parse(str);
        }
    };
});

var p = new AutomaticDictionary.Lib.PersistentObject(
    "my_hash_data",
    store_object,
    {
        read:["get"],
        write:["set"],
        serializer: "toJSON",
        loader:"fromJSON",
        logger:logger
    },
    function(){
        return new SerializableThing();
    }
    );

assert.isUndefined(p.get("A"));

assert.isUndefined(store_object.get("my_hash_data"));

//No set has been done
assert.equal(0,store_object.log("set").length);

p.set("A",1);

assert.equal(1,store_object.log("set").length);
assert.equalJSON(["my_hash_data","{\"A\":1}"],store_object.log("set")[0]);

assert.equal(1, p.get("A"));

assert.equal("{\"A\":1}",store_object.get("my_hash_data"));

assert.isUndefined(p.get("B"));

p.set("A",1);

assert.equal(2,store_object.log("set").length);

assert.equal("{\"A\":1}",store_object.get("my_hash_data"));


//Another instance gets the last value stored

var p2 = new AutomaticDictionary.Lib.PersistentObject(
    "my_hash_data",
    store_object,
    {
        read:["get"],
        write:["set"],
        serializer: "toJSON",
        loader:"fromJSON"
    },
    function(){
        return new SerializableThing();
    }
    );
        
assert.equal(1, p2.get("A"));

//Test reload()

p.set("B",2);

assert.isUndefined(p2.get("B"));

p2.reload();

assert.equal(2, p2.get("B"));
