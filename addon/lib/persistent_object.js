/*
 * PersistentObject allows to store the status of an instance when it has changes.
 *
 * The changes are detected because an update method is called.
 *
 * The storage is delegated to a storage object which accepts the #set and #get 
 * methods and strings as value and key.
 **/

/*
 *  Constructor needs
 *  @storeKey the string that identifies the data on the storage.
 *  @storage an object with set(string key, string value) and get(string key):string
 *  @options is a hash with the keys:
 *      "read" and "write": 
 *          each one with an array of methods that can be called. (Proxy methods)
 *      "serializer": the method of the instance that dumps the data to string.
 *      "loader": the instance method that loads the serialized string inside the object.
 *      "reload": (optional) the name of the method that will perform the load from storage. The method
 *          is defined automatically. You only have to say a name for it.
 *  @constructor is a function that returns the object constructed.

An example:

p = new PersistentObject(
  "my_hash_data",
  store_object,
  {
    read:["get"],
    write:["set"],
    serializer: "toJSON",
    loader:"fromJSON",
    reload: "reload"
  },
  function(){return new LRUHashV2();}
);

**/


export function apply(AutomaticDictionary) {
  AutomaticDictionary.Lib.PersistentObject = function(storeKey,storage,options,constructor){
    //To keep the object clean, all the inner code is kept on this scope and not
    //on the prototype.
    var params = {
      key: storeKey,
      options: options,
      constructor: constructor,
      storage: storage
    };
    var ifce = {}, obj, tmp, i;

    function getData(){
      return params.storage.get(params.key);
    }

    function setData(){
      var v = obj[params.options.serializer]();
      return params.storage.set(params.key,v);
    }

    async function buildAsync(){
      var o = constructor();
      var data = await getData();
      if( data ){
        o[params.options.loader](data);
      }
      return o;
    }
    var objReady = buildAsync().then(function(o){
      obj = o
    });

    //Proxy methods
    //
    // Read methods
    for(i=0; i < params.options.read.length; i++){
      tmp = params.options.read[i];
      //Double function to deattach the tmp from the loop.
      //http://stackoverflow.com/questions/750486/javascript-closure-inside-loops-simple-practical-example
      ifce[tmp] = (function(method){
        return async function(){
          await objReady;
          return obj[method].apply(obj, arguments);
        }
      })(tmp);
    }

    //Write methods
    for(i=0; i < params.options.write.length; i++){
      tmp = params.options.write[i];

      ifce[tmp] = (function(method){
        return async function(){
          var ret = obj[method].apply(obj,arguments);
          //store change
          await setData();
          return ret;
        };
      })(tmp);
    }
    return ifce;
  };
}