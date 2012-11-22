/*
 * LockedObject 
 
locked = new LockedObject(
    "my_hash_data",
    storage
    {
        non_locking:["get"],
        locking:["set"],
        reload: "reload"
    },
    p
);

 **/

/*
 * Constructor
 * 
 * @key string that defines the object
 * @storage a key value storage to share the lock between running instances
 * @options is a hash with the keys:
 *      "non_locking": list of methods that can be called concurrenty, usually because
 *          they do not update the info.
 *      "locking": list of methods that must lock the instance to make sure the
 *          change is performed in order by all instances.
 *      "reload": method name to call when you want the instance to reload from the storage.
 * @instance the object that recieves the calls
 * 
 **/
AutomaticDictionary.Lib.LockedObject = function(storeKey,storage,options,instance){
    var ifce = {}, 
    tmp, i,
    version_key= storeKey+".version",
    lock_key= storeKey+".lock",
    current_version = 0,
    internal_counter = 0,
    //Taking into account that we will not init two SharedObject at the same time
    locker_id = (new Date()).getTime().toString() + Math.floor(Math.random()*1000000);
    var params = {
        storeKey: storeKey,
        storage:storage,
        options:options,
        instance:instance
    }
    var logger = params.options.logger || AutomaticDictionary.Lib.LoggerStub;
    
    //Check required options
    var required_options = ["locking","reload"];
    for(i=0; i < required_options.length; i++){
        tmp = required_options[i];
        if( typeof(params.options[tmp]) === "undefined" || params.options[tmp].length < 1 ){
            throw("option "+tmp+" is required");
        }
    }
    
    
    //Updates data if version has changed.
    function refresh(){
        var v2, v = params.storage.get(version_key);
        logger.debug("called refresh - current: "+current_version + " - storage: "+v);
        if( v != current_version){
            instance[params.options.reload]();
            current_version = v;
            v2 = params.storage.get(version_key);
            logger.debug("version is "+v2);
            if( v2 != v ){
                //The version has changed meanwhile. Reload again.
                //Recursive call.
                logger.warn("Recursive call as refresh detects its not last version: "+JSON.stringify([v2,v]));
                refresh();
            }
        }
    }
    
    function sincronized( func, force ){
        if( force ) logger.warn("sincronized with force");
        try{
            var lock = params.storage.get( lock_key );
            logger.debug("lock is " + lock);
            var nestedSync = gotLock();
            if( force || nestedSync ||
                ((typeof lock) === "undefined") || lock === ""  ){
                //No lock is set so we set ours.
                params.storage.set( lock_key, locker_id );
                //Check if someone else has got the lock meanwhile.
                if( force || gotLock() ){
                    logger.debug("executing on sync");
                    func();
                    if( !nestedSync ){
                        params.storage.set( lock_key, "" ); //Release lock
                        logger.debug("lock released is " +
                            params.storage.get( lock_key ));
                    }else{
                        logger.debug("nested lock not released");
                    }
                    return true;
                }else{
                    logger.warn("lock is not its own: " +
                        params.storage.get( lock_key ) + " != " + locker_id);
                }
            }else{
                logger.warn("The instance is locked rightnow by "+lock);
            }
        }catch(e){
            logger.error("Sincronized failed: " + e.message);
            logger.info("Releasing the lock");
            params.storage.set( lock_key, "" ); //Release the lock
            throw e;
        }
        logger.debug("syncronized is false");
        return false;
    }
    
    //True when this instance has the lock
    function gotLock(){
        return (""+ params.storage.get( lock_key )) === locker_id;
    }
    
    /**
     * Function to try to do an operation in sync but gets tired after n retrires
     */
    function sincronized_with_patience( func, times ){
        for(var t=0; t<times; t++){
            if(sincronized(func, t == (times-1))) return true;
            logger.debug("AD.SharedHash#sincronized_with_patience it:"+t);
        }
        logger.error("UNREACHABLE CODE REACHED. Internal error. Logs and debugging can be required.");
        return false; //It should not reach here never!
    }
    
    function readVersion(){
        return params.storage.get( storeKey + ".version" );
    }
    
    function writeVersion( v ){
        return params.storage.set( storeKey + ".version", v);
    }
    
    //Define not_locked methods in ifce proxy
    for(var i=0;i<params.options.non_locking.length; i++){
        tmp = params.options.non_locking[i];
        ifce[tmp] = (function(method){
            return function(){
                //logger.debug("Calling "+method+" with "+JSON.stringify(arguments));
                refresh();
                return params.instance[method].apply(params.instance, arguments);
            };
        })(tmp);
    }
    
    //TODO: Wrap lock methods in sync and 
    for(var i=0;i<params.options.locking.length; i++){
        tmp = params.options.locking[i];
        if(ifce[tmp]) throw ("overriding non_locking method "+tmp);
        ifce[tmp] = (function(method){
            return function(){
                //logger.debug("Calling "+method+" with "+JSON.stringify(arguments));
                var next_version = "" + locker_id +"_"+ internal_counter++;
                var ret, method_args = arguments;
                sincronized_with_patience( 
                    function(){
                        refresh(); //Avoid to ask for sync again
                        ret = params.instance[method].apply(params.instance, method_args);
                        writeVersion( next_version );
                        logger.debug("LockedObject("+locker_id+") write data sucess");
                    }, 10 );
                return ret;
            };
        })(tmp);
    }
    
    return ifce;
}
