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
- Remove everything that does not serve the .get .set
  - Including locks.
- Use PersistentObject to store this structure and remove prefManager usage.

*/
export function apply(AutomaticDictionary) {
  AutomaticDictionary.SharedHash = function( options ){
    options = options || {};
    this.logger = options.logger || new AutomaticDictionary.Lib.NullLogger();
    this.maxSize = options.maxSize;
    return this;
  }
  AutomaticDictionary.SharedHash.prototype = {
    data: null,
    maxSize: null, //Max number of keys.
    //The builder/constructor of the data strucutre (LRU HASH)
    dataConstructor: AutomaticDictionary.Lib.LRUHashV2,
    expiration_callback: null,
    logger: null,

    load: function(){
      this.maxSize = this.prefManager.getIntPref( this.prefPath + ".maxSize" );
      this.data = this.readData();
      this.version = this.readVersion();
    },
        readData:function(){
            var v = this.prefManager.getCharPref( this.prefPath );
            var hash = new this.dataConstructor();
            if( v ){
                try{
                    hash.fromJSON( v );
                }catch(e){
                    //Restore in case it gets wrong status
                    this.logger.error("Failed to load data with " + e.toString() );
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

    set: function(key, value){
      var _this = this;
      _this.refresh(); //Avoid to ask for sync again
      _this.data.set(key, value);
      _this.writeData();
      _this.logger.info("AutomaticDictionary.SharedHash("+_this.id+") write data sucess");
    },

    get: function(key){
      this.refresh();
      return this.data.get(key);
    },
        //Updates to last version of data
        refresh:function(){
          this.load()
        },
        size: function(){
            this.refresh();
            return this.data.size();
        },
        keys: function(){
            this.refresh();
            return this.data.keys();
        }
    }
}