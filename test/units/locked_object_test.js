//logger.setLevel("debug");
try{
    //Test it stores and loads the object...
    var store_object = Tools.StoreObjectStub();
    reload_calls = 0;

    //Instance to simulate remote storage (persistence)
    global_data = null;
    //A silly hash whith serializable methods
    var LockableThing = (function(){
        var data = {};
    
        return {
            set: function(k,v){
                logger.debug("LockableThing - called SET with "+k + " and value "+ v);
                data[k] = v;
                global_data = JSON.stringify(data);
            },
            get: function(k){
                logger.debug("LockableThing - called GET with "+k);
                return data[k];
            },
            toJSON: function(){
                return JSON.stringify(data);
            },
            fromJSON: function( str ){
                logger.debug("LockableThing - from json recieves "+ str);
                data = JSON.parse(str);
            },
            reload: function(){
                reload_calls++;
                logger.debug("LockableThing - reload with data "+global_data);
                data = JSON.parse(global_data) || {};
            }
        };
    });

    var obj = new LockableThing();

    var locked = new AutomaticDictionary.Lib.LockedObject(
        "my_hash_data",
        store_object,
        {
            non_locking:["get"],
            locking:["set"],
            reload: "reload",
            logger: logger
        },
        obj
        );

    assert.equal(0, store_object.log("set").length);
    assert.equal(0, store_object.log("get").length);

    assert.isUndefined(locked.get("X"));

    assert.equal(0, store_object.log("set").length);
    //Two reads on the version
    assert.equal(2, store_object.log("get").length);
    assert.equalJSON([["my_hash_data.version"],["my_hash_data.version"]],store_object.log("get"));   

    assert.isUndefined(locked.set("X","2"));

    assert.equal(3, store_object.log("set").length);

    //Test it locks by sharing the same key "my_share_data";

    var other_obj = new LockableThing();
    other_obj.fromJSON(global_data);
    var other_locked = new AutomaticDictionary.Lib.LockedObject(
        "my_hash_data",
        store_object,
        {
            non_locking:["get"],
            locking:["set"],
            reload: "reload",
            logger: logger
        },
        other_obj
    );

    assert.isUndefined(locked.set("X","2"));
    assert.equal("2",other_locked.get("X"));

    other_locked.set("Y","3");

    assert.equal("3", other_locked.get("Y"));
    assert.equal("3", locked.get("Y"));

    locked.set("Y","4");

    assert.equal("4", other_locked.get("Y"));
    assert.equal("4", locked.get("Y"));


}finally{
    //logger.setLevel("info");
}

