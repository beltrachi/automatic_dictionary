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
    
    //options.customVars can be an array as order matters
    function track(url, options){
    
        var extras = {};
        if( options && options.customVars ){
            //We supose basic settings like that this settigs are visitor 
            //settings and not from this action.
            var first=[], last = [];
            
            for(var i = 0; i < options.customVars.length; i++ ){
                options.customVars[i].name;
                first.push(options.customVars[i].name);
                last.push(options.customVars[i].value);
            }
            
            extras["utme"] = "8("+first.join("*")+")9("+last.join("*")+")11(1)"
        }
        
        var extras_querystring = "";
        for(var key in extras){
            extras_querystring += ""+key+"="+extras[key]+"&";
        }
    
        var i=1000000000,
        utmn=rand(i,9999999999), //random request number
        cookie = visitor_id,
        today=current_session,
        win = window.location,
        img = new Image(),
        urchinUrl = 'http://www.google-analytics.com/__utm.gif?utmwv=5.1.7&utmn='
        +utmn+'&utmsr=-&utmsc=-&'
        + extras_querystring
        + 'utmul=' + window.navigator.language
        +'&utmje=0&utmfl=-&utmdt=-&utmhn='
        +domain+'&utmr='+win+'&utmp='
        +url+'&utmac='
        +code+'&utmcc=__utma%3D'
        +domain_hash+'.'
        +visitor_id+'.'
        +first_visit+'.'
        +last_session+'.'
        +current_session+'.'
        +session_number+'%3B%2B__utmb%3D'
        +cookie+'%3B%2B__utmc%3D'
        +cookie+'%3B%2B__utmz%3D'
        +cookie+'.'+today
        +'.2.2.utmccn%3D(referral)%7Cutmcsr%3D' + win.host + '%7Cutmcct%3D' 
        + win.pathname + '%7Cutmcmd%3Dreferral%3B%2B__utmv%3D'
        +cookie+'.-%3B';

        AutomaticDictionary.dump("GA (" + cookie + ") -> "+urchinUrl);
        // trigger the tracking
        img.src = urchinUrl;
    }
    
    return {
        track:track
    };
});