if(typeof(Tools) == "undefined"){ 
    Tools = {}; 
};

Tools.printStackTrace = function(){
};

Tools.output = function(arr) {
  if( typeof( arr.length ) != undefined )
      arr = arr.join(' ');
      
  //Optput however you want
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