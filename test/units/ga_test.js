//Test SortedSet
logger.info("Testing ga.js (GoogleAnalytics)");
var data = {};
var storage = {
    get: function(key){
        return data[key];
    },
    set: function(key, value){
        data[key] = value;
    }
}
created_images = [];
var window = {
    location: {
        host:"host",
        pathname:"pathname"
    },
    navigator: {
        language:"en_us"
    }
};

window.Image = function(){
    var item = {};
    created_images.push(item);
    return item;
}

var ga = AutomaticDictionary.Lib.GoogleAnalytics(
{
    storage: storage,
    code: "UA",
    domain: "domain",
    window: window
}
);

AutomaticDictionary.dump = function(msg){
    logger.debug("AD: "+msg)
    };

// Check initialization
assert.equal(0, created_images.length);
assert.equal(true, !!ga.visit); //check it has track method
logger.debug(data.toSource());

assert.equal("1", data.session_number);

var first_visitor_id = data.visitor_id;

//Check it's setted
assert.equal(true, !!data.first_visit);
assert.equal(true, !!data.last_session);

ga.visit("actionurl");

assert.equal(1,created_images.length);
assert.contains( "https://ssl.google-analytics.com/__utm.gif",
    created_images[0].src);
assert.contains( data.visitor_id, created_images[0].src);    
assert.contains( data.first_visit, created_images[0].src);    
assert.contains( data.last_session, created_images[0].src);    
assert.contains( data.session_number, created_images[0].src);
assert.contains( "en_us",created_images[0].src);
assert.contains( "actionurl", created_images[0].src);    

ga.visit("foobar");

assert.equal(2,created_images.length);
assert.contains( "https://ssl.google-analytics.com/__utm.gif",
    created_images[1].src);
assert.contains( data.visitor_id, created_images[1].src);    
assert.contains( data.first_visit, created_images[1].src);    
assert.contains( data.last_session, created_images[1].src);    
assert.contains( data.session_number, created_images[1].src);    
assert.contains( "foobar", created_images[1].src);    

var last_session = data.last_session;

//Restart session. Check what has to happen

var ga2 = AutomaticDictionary.Lib.GoogleAnalytics(
{
    storage: storage,
    code: "UA",
    domain: "domain",
    window:window
}
);

assert.equal(first_visitor_id, data.visitor_id);
//Last session changed
assert.isTrue(last_session != data.last_session);
assert.equal(2, data.session_number);

//Check custom Vars support
ga2.visit("foo",{
    customVars:
    [ 
    {
        name:"aurum", 
        value:"lauren"
    }, 

    {
        name:"key2", 
        value:"lorem"
    }
    ]
});
assert.equal(3, created_images.length);

var img = created_images[2];

assert.contains("utme=", img.src);
assert.contains("lauren", img.src);
assert.contains("aurum", img.src);
assert.contains("lorem", img.src);
assert.contains("key2", img.src);
