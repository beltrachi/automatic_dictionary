// TODO: migrate prefs to local stoarge.
console.log('Background script loaded.');

console.log("HI HI HI");
console.log(browser.compose_ext.sayHello('foooofff'));
console.log("HO HO HO");

browser.compose_ext.onLanguageChange.addListener(function (param){
    console.log("Listener has received event. Language changed?!? param is following");
    console.log(param);
});

browser.compose_ext.onRecipientsChange.addListener(function (tabId){
    console.log("Listener has received event. Recipients changed?!?");
    console.log(tabId);
});