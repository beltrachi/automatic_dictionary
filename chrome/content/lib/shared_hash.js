/**
 *   SharedHash is used to share preferences between compose windows in case you
 *   have more than one open window open.
 *   Features:
 *       * When a set is done, it will be available to all SharedHashes through preferences-service
 *       * To spread the changes we save a version number in another preference field
 * 
 *   data stored expires by size in a LRU logic.
 * 
 *  Note: Persistency and Locking has been extracted to separate wrappers:
 *      LockedObject and PersistentObject 
 */
/* 
TODO: 
    Use an observer of the preference to avoid having to load the data over and
    over again to know if somebody has updated it.
    We need to install an observer using the nsIPrefBranch2 interface.
*/
AutomaticDictionary.SharedHash = function( prefPath ){
    this.prefPath = prefPath;
    this.lockPath = prefPath + ".lock";
    this.prefManager = Components.classes["@mozilla.org/preferences-service;1"]
        .getService(Components.interfaces.nsIPrefBranch);
    //Taking into account that we will not init two SharedHashes at the same time
    this.id = (new Date()).getTime().toString() + Math.floor(Math.random()*1000000);

    return this;
}
AutomaticDictionary.SharedHash.prototype = {
    id: null,
    internal_version: 1,
    prefPath: null,
    prefManager: null,
    lockPath: null,
    data: null,
    version: null,
    maxSize: null, //Max number of keys.
    //The builder/constructor of the data strucutre (LRU HASH)
    dataConstructor: AutomaticDictionary.Lib.LRUHashV2, 
    expiration_callback: null,
    
    load: function(){
        this.maxSize = this.prefManager.getIntPref( this.prefPath + ".maxSize" );
        this.data = this.readData();
        this.version = this.readVersion();
    },
    readVersion: function(){
        return this.prefManager.getCharPref( this.prefPath + ".version" );
    },
    writeVersion: function( v ){
        return this.prefManager.setCharPref( this.prefPath + ".version", v);
    },
    readData:function(){
        var v = this.prefManager.getCharPref( this.prefPath );
        var hash = new this.dataConstructor();
        if( v ){
            try{
                hash.fromJSON( v );
            }catch(e){
                //Restore in case it gets wrong status
                this.log("Failed to load data with " + e.toString() );
                hash = new this.dataConstructor();
            }
        }
        hash.expiration_callback = this.expiration_callback;
        //Override max_size
        hash.max_size = this.maxSize;
        return hash;
    },
    writeData:function(){
        return this.prefManager.setCharPref(
            this.prefPath, this.data.toJSON() );
    },
    
    sincronized:function( func, force ){
        if( force ) this.log("WARN AutomaticDictionary.SharedHash#sincronized with force");
        try{
            this.log("lock is " + JSON.stringify(
                this.prefManager.getCharPref( this.lockPath )));
            var nestedSync = this.gotLock();
            if( force || nestedSync ||
                    this.prefManager.getCharPref( this.lockPath ).length == 0  ){
                this.prefManager.setCharPref( this.lockPath, this.id );
                this.log("2 - lock is " +
                    JSON.stringify(this.prefManager.getCharPref( this.lockPath )));
                if( force || this.gotLock() ){
                    this.log("executing on sync");
                    func();
                    if( !nestedSync ){
                        this.prefManager.setCharPref( this.lockPath, "" ); //Release lock
                        this.log("lock released is " +
                            this.prefManager.getCharPref( this.lockPath ));
                    }else{
                        this.log("nested lock not released");
                    }
                    return true;
                }else{
                    this.log("lock is not its own: " +
                        this.prefManager.getCharPref( this.lockPath ) + " != " + this.id);
                }
            }else{
                this.log("no force neither is empty");
            }
        }catch(e){
            this.log("ERROR Sincronized failed: " + e.message);
            this.log("INFO Releasing the lock");
            this.prefManager.setCharPref( this.lockPath, "" ); //Release the lock
            throw e;
        }
        this.log("syncronized is false");
        return false;
    },
    
    gotLock:function(){
        return this.prefManager.getCharPref( this.lockPath ).toString() == this.id;
    },
    
    /**
    * Function to try to do an operation in sync but gets tired after n retrires
    */
    sincronized_with_patience:function( func, times ){
        for(var t=0; t<times; t++){
            if(this.sincronized(func, t == (times-1))) return true;
            this.log("DEBUG AD.SharedHash#sincronized_with_patience it:"+t);
        }
        this.log("UNREACHABLE CODE REACHED. Internal error. Logs and debugging can be required.");
        return false; //It should not reach here never!
    },
    
    set: function(key, value){
        var next_version = this.id + this.internal_version++;
        var _this = this;
        this.sincronized_with_patience( 
            function(){
                _this.refresh(); //Avoid to ask for sync again
                _this.data.set(key, value);
                _this.writeVersion( next_version );
                _this.writeData();
                _this.log("INFO AutomaticDictionary.SharedHash("+_this.id+") write data sucess");
            }, 10 );
    },
    
    get: function(key){
        this.refresh();
        return this.data.get(key);
    },
    //Updates to last version of data
    refresh:function(){
        if( this.version != this.readVersion() ){
            var _this = this;
            this.sincronized_with_patience(function(){ 
                _this.load()
            }, 10 );
        }
        this.log(this.data.toSource());
    },
    size: function(){
        this.refresh();
        return this.data.size();
    },
    keys: function(){
        this.refresh();
        return this.data.keys();
    },
    log: function(msg){
        AutomaticDictionary.dump(msg);
    }
}
