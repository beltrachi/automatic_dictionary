if( typeof(AutomaticDictionary)=== "undefined" ){
    var AutomaticDictionary = {};
}

//Used on a text field allows to control the value of the field in a range.
// defv is the default value
AutomaticDictionary.check_int_range = function( field , min, max, defv ){
    defv = defv || min;
    var value = field.value * 1;
    // reset if it's not the same as string of it
    if( (value === NaN) || (value + "" !== field.value) ){
        field.value = defv;
    }
    if( value < min ){
        field.value = min;
    }else if( value > max ){
        field.value = max;
    }

    return false;
};

// onload to fix prefpanel size https://bugzilla.mozilla.org/show_bug.cgi?id=451997
window.addEventListener("DOMContentLoaded", function(evt){
    document.documentElement.style.maxWidth =
        ((screen.availWidth || screen.width) - 100) + "px";
    document.documentElement.style.maxHeight =
        ((screen.availHeight || screen.height) - 100) + "px";

    var descriptions = document.getElementsByTagName('description');
    for (var i=0; i < descriptions.length; i++) {
        descriptions[i].style.height = document.defaultView
            .getComputedStyle(descriptions[i], null).getPropertyValue('height');
        descriptions[i].style.width = document.defaultView
            .getComputedStyle(descriptions[i], null).getPropertyValue('width');
    }
});

//Bootup and shutdown to migrate data when required.
var ad = new AutomaticDictionary.Class({
    window: window,
    compose_window_builder: AutomaticDictionary.ComposeWindowStub
});
ad.stop();

function sendLogToDeveloper(link){
    try{
        var body = document.getElementById('mailToDev_body').textContent;
        var subject = document.getElementById('mailToDev_subject').textContent;
        AutomaticDictionary.Lib.MailComposer.openComposeMailWindow(
            'beltrachi+ad@gmail.com',null, subject, body,
            [AutomaticDictionary.logger.filepath]);
    }catch(e){ AutomaticDictionary.logger.error(e) }
}
