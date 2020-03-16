import { AutomaticDictionary } from "./ad.js";

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

console.log('Background script loaded.');
