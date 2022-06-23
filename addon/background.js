import { AutomaticDictionary } from "./ad.js";
import { ComposeWindow } from "./ad/compose_window.js";
import { ComposeWindowStub } from "./ad/compose_window_stub.js";

// Trigger migrations
var initial_ad = new AutomaticDictionary.Class(
  {
    compose_window_builder: ComposeWindowStub
  }
);

browser.windows.onCreated.addListener(function (window) {
  console.log("window created");
  try {
    var ad = new AutomaticDictionary.Class({
      compose_window_builder: ComposeWindow,
      window: window
    });
  } catch (e) {
    console.error(e);
  }
});

console.debug('Background script loaded.');
