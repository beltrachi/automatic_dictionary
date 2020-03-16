import { AutomaticDictionary } from "./ad.js";

console.log('Background script loaded.');

console.log("HI HI HI");

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

console.log("HO HO HO");
