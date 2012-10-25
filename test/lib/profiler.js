Profiler = {
    stats: {},
    prefix: "orig_",
    
    profile_method: function( proto, name, ns ){
        var orig = prefix + name;
        logger.info("profiling "+ name);
        if(!Profiler.stats[ns])
            Profiler.stats[ns] = {};
        Profiler.stats[ns][name] ={
            n: 0,
            delta: 0,
            name: name
        }
        var prefix= Profiler.prefix, old = proto[name];
        proto[orig] = old;
        
        proto[name] = function(){
            var ret, start = (new Date()).getTime();
            Profiler.stats[ns][name].n++;
            ret = this[orig].apply(this,arguments);
            Profiler.stats[ns][name].delta += (new Date()).getTime() - start;
            return ret;
        };
    },
    profile_proto:function(proto, name){
        var m,list=[], fname;
        for(m in proto){
            list.push(m);
        }
        logger.info("list is "+list);
        for(var i=0; i< list.length;i++){
            fname = list[i];
            if( typeof(proto[fname]) === "function"){
                Profiler.profile_method(proto, fname, name);
            }
        }
    },
    
    
    //Output sorted and shown as table
    print_stats:function(orderby){
        orderby = orderby || "n";
        var pad = function(s, len){
            while(s.length < len){
                s += " ";
            }
            return s;
        }
        var sep = "|", out="";
        //Convert hash to array
        var rows = [], 
            cols = [ "name", "n", "delta"],
            data = Profiler.stats,
            value;
        var max_len = 0;
        for(var ns in data){
            var ns_ = data[ns];
            for( var m in ns_){
                var m_ = ns_[m];
                var row = [ ns ];
                for(var i =0; i < cols.length; i++){
                    value = ""+ m_[cols[i]];
                    row.push(value);
                    max_len = Math.max(max_len, parseInt( value.length));
                }
                rows.push(row);
            }
        }
        var sort_idx = cols.indexOf(orderby) +1;
        rows.sort(function(a,b){
            var va = a[sort_idx], vb = b[sort_idx];
            return (va == vb ? 0 : ( va > vb ? 1 : -1 )); 
        });
        
        var other = rows;
        rows = [["ns","name","n", "delta"]];
        rows = rows.concat(other);
        
        //TODO SORT
        for(var i=0; i< rows.length; i ++){
            var row = rows[i];
            out += "";
            for(var j=0; j< row.length; j++){
                out += sep + pad(row[j], max_len);
            }
            out+= "\n";
        }
        return "\n" + out;
    }
}