import { AutomaticDictionary } from "./ad.js";

browser.prefs.getCharPref('foo').then(console.log).catch(console.error);

var ad = null;
try {
  ad = new AutomaticDictionary.Class({
    compose_window_builder: AutomaticDictionary.ComposeWindowStub,
    window: window
  });
}catch(e){
  console.log(e);
}

// Localize texts
for (const node of document.querySelectorAll('[data-i18n]')) {
  let id = node.dataset.i18n;
  var text = browser.i18n.getMessage(id);
  if(node.nodeName == "INPUT" && node.type.toLocaleUpperCase()=="BUTTON"){
    node.value = text;
  }else{
    node.appendChild(document.createTextNode(text));
  }
}

async function setNode(node){
  let pref = node.dataset.preference;
  console.log(node);
  let value = await ad.prefManager.get(ad.pref_prefix + pref);
  console.log(value);
  switch(node.nodeName) {
  case "SELECT":
    var option = node.querySelectorAll('[value='+value+']')[0];
    option.selected = true;
    break;
  case "INPUT":
    node.value = value;
    // code block
    break;
  default:
    console.log("Unknown node type " + node.nodeName);
    console.log(node);
    // code block
  }
}

//TODO: load preferences
ad.addEventListener('load', function(){
  for (const node of document.querySelectorAll('[data-preference]')) {
    setNode(node);
  }
});

//TODO: implement save button
