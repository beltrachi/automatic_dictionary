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
Image = function(){
    var item = {};
    created_images.push(item);
    return item;
}

var ga = AutomaticDictionary.Lib.GoogleAnalytics(
    {
        storage: storage,
        code: "UA",
        domain: "domain"
    }
);
window = {
    location: {host:"host",pathname:"pathname"}
}

AutomaticDictionary.dump = function(msg){logger.debug("AD: "+msg)};

// Check initialization
assert.equal(0, created_images.length);
assert.equal(true, !!ga.track); //check it has track method
logger.debug(data.toSource());

assert.equal("1", data.session_number);

var first_visitor_id = data.visitor_id;

//Check it's setted
assert.equal(true, !!data.first_visit);
assert.equal(true, !!data.last_session);

ga.track("actionurl");

assert.equal(1,created_images.length);
assert.contains( "http://www.google-analytics.com/__utm.gif",
    created_images[0].src);
assert.contains( data.visitor_id, created_images[0].src);    
assert.contains( data.first_visit, created_images[0].src);    
assert.contains( data.last_session, created_images[0].src);    
assert.contains( data.session_number, created_images[0].src);    
assert.contains( "actionurl", created_images[0].src);    

ga.track("foobar");

assert.equal(2,created_images.length);
assert.contains( "http://www.google-analytics.com/__utm.gif",
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
        domain: "domain"
    }
);

assert.equal(first_visitor_id, data.visitor_id);
//Last session changed
assert.isTrue(last_session != data.last_session);
assert.equal(2, data.session_number);
