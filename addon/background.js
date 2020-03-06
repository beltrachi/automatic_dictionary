// TODO: migrate prefs to local stoarge.
console.log('Background script loaded.');

console.log("HI HI HI");
console.log(browser.compose_ext.sayHello('foooofff'));
console.log("HO HO HO");

browser.compose_ext.onLanguageChange.addListener(function (window){
    console.log("Listener has received event. Language changed?!?");
});