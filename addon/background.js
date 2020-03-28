import { AutomaticDictionary } from "./ad.js";

// Trigger migrations
var initial_ad = new AutomaticDictionary.Class(
  {
    compose_window_builder: AutomaticDictionary.ComposeWindowStub
  }
);

browser.windows.onCreated.addListener(function(window){
    console.log("window created");
    try {
        var ad = new AutomaticDictionary.Class({
            compose_window_builder: AutomaticDictionary.ComposeWindow,
            window: window
        });
    }catch(e){
        console.error(e);
    }
});

console.debug('Background script loaded.');
