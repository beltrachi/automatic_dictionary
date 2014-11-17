if(typeof(Tools) == "undefined"){ 
    Tools = {}; 
};

Tools.printStackTrace = function(){
    // Sort of hack as exceptions on Rhino does not have the stack accessor.
    try{
        var foo;
        foo.fakeErrorToGetStackTrace();
    }catch(e){
        if(e.rhinoException){
            e.rhinoException.printStackTrace();
        }else{
            print("No rhino stack trace?");
            print(e.stack);
        }
    }
};

Tools.output = function(arr) {
  if( typeof( arr.length ) != undefined )
      arr = arr.join(' ');
      
  //Output however you want
  print( arr );
};

//Storage stub for testing purposes
Tools.StoreObjectStub = function(){
    var ifce, data={};
    var log = {set:[],get:[]};
    return {
        set: function(k,v){
            log.set.push([k,v]);
            data[k]=v;
        },
        get: function(k){
            log.get.push([k]);
            return data[k];
        },
        data: function(k){
            return data;
        },
        log:function(method){
            return log[method];
        }
    }
}