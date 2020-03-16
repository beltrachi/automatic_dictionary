import { AutomaticDictionary } from "./ad.js";

console.log('Background script loaded.');

console.log("HI HI HI");


browser.compose_ext.onLanguageChange.addListener(function (param){
    console.log("Listener has received event. Language changed?!? param is following");
    console.log(param);
});

browser.compose_ext.onRecipientsChange.addListener(function (tabId){
    console.log("Listener has received event. Recipients changed?!?");
    console.log(tabId);
});

browser.windows.onCreated.addListener(function(window){
    console.log("window created");
    try {
        var ad = new AutomaticDictionary.Class({
            compose_window_builder: AutomaticDictionary.ComposeWindow,
            window: window
        });
    }catch(e){
        console.log(e);
    }
});

browser.prefs.getCharPref('xxx').then(console.info);

console.log("HO HO HO");
