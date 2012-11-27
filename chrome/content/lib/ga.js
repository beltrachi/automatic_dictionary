if( !AutomaticDictionary ) AutomaticDictionary = {
    Lib:{}
};
/*
 *  Class to send visits to Google Analytics
 *  
 * Builder expects the config:
 *      code: ga urchin code UA-XXXXXX
 *      storage: a object that accepts set(key,value) and get(key) => value
 *          Values stored here are expeted to be persistent.
 *      domain: the domain expected to be the visits.
 *      
 **/
//TODO: extract this code as a standalone code.
AutomaticDictionary.Lib.GoogleAnalytics = (function(config){
    
    var domain = config.domain, 
        code = config.code,
        storage = config.storage,
        target = config.url || "https://ssl.google-analytics.com/__utm.gif",
        domain_hash,
        visitor_id,
        first_visit,
        last_session,
        current_session,
        session_number;
        
    // Generate an int based on the string. A simple hash.
    function hash( string ){
        var out=1;
        for(var i =0; i < string.length; i++){
            out += string.charCodeAt(i) * (10^i);
        }
        return out;
    }
        
    function rand(min, max) {
        return min + Math.floor(Math.random() * (max - min));
    }
    
    //Init
    domain_hash = hash(domain);
    
    //Inc session number on each init.
    session_number = 1 + ( parseInt(storage.get("session_number")) || 0);
    storage.set("session_number", session_number);
    
    visitor_id = storage.get("visitor_id") || rand(10000000,99999999);
    storage.set("visitor_id", visitor_id)
    
    first_visit = storage.get("first_visit") || (new Date()).getTime();
    storage.set("first_visit", first_visit);
    
    current_session = (new Date()).getTime();
    last_session = storage.get("last_session") || current_session;
    storage.set("last_session", current_session);
    
    function doRequest(visit_url,params,options){
        options = options || {};
        var img = new Image(),
            defaults, i, 
            queryString ="",
            win = options.window || window.location,
            cookie = options.cookie || visitor_id;
        
        defaults={
            utmn: rand(1000000000,9999999999), //random request number
            cookie:visitor_id,
            today:current_session,
            win:win,
            utmwv:"5.1.7",
            utmsr:"-",
            utmsc:"-",
            utmul: window.navigator.language,
            utmje:0,
            utmfl:"-",
            utmdt:"-",
            utmhn:domain,
            utmr:win,
            utmp:visit_url,
            utmac:code,
            utmcc:'__utma='
                +domain_hash+'.'
                +visitor_id+'.'
                +first_visit+'.'
                +last_session+'.'
                +current_session+'.'
                +session_number+';+__utmb='
                +cookie+';+__utmc='
                +cookie+';+__utmz='
                +cookie+'.'+current_session
                +'.2.2.utmccn=(referral)|utmcsr=' + win.host + '|utmcct=' 
                + win.pathname + '|utmcmd=referral;+__utmv='
            +cookie+'.-;'
            };
        
        //Proces options.customVars
        if( options && options.customVars ){
            //We supose basic settings like that this settigs are visitor 
            //settings and not from this action.
            var eight=[], nine = [];
            
            for(i = 0; i < options.customVars.length; i++ ){
                eight.push(options.customVars[i].name);
                nine.push(options.customVars[i].value);
            }
            
            params["utme"] = (params["utme"]||"") + 
                "8("+eight.join("*")+")"+
                "9("+nine.join("*")+")"+
                "11(1)";
        }
        
        //Set default values
        for(i in defaults){
            if((typeof params[i]) == "undefined"){
                params[i] = defaults[i];
            }
        }
        
        for(i in params){
            //FIXME: escape params value
            queryString+= i+"="+encodeURIComponent(params[i])+"&";
        }
        AutomaticDictionary.dump("GA URL is "+target+"?"+queryString);
        img.src = target +"?"+ queryString;
    }
    //options.customVars can be an array as order matters
    function visit(url, options){
        doRequest(url,{},options);
    }
    
    /*
     * @event_data is a hash with:
     *      "cat": string category like "Image"
     *      "action": string action like "click"
     *      "label": (optional) String labels the action. Recommend using something to 
     *          describe the location or situation where event ocurred.
     *      "value": (optional) integer when the action has a numeric "impact" or "meaning"
     *      "non_interaction": (optional) boolean meaning that this is not an interaction
     *          and so the visit could still be considered a bounce.
     *
     **/
    function event(url,event_data,options){
        var glue = "*",
            val = event_data.cat + glue + event_data.action,
            params = {
                utmt:"event"
            };
        
        if(event_data.label){
            val += glue + event_data.label;
        }
        params["utme"]="5("+val+")";
        
        if(event_data.value){
            params["utme"] +="("+event_data.value+")";
        }
        
        if(event_data.non_interaction){
            params["utmni"]="1";
        }
        
        doRequest(url,params, options);
    }
    
    return {
        visit:visit,
        event:event
    };
});