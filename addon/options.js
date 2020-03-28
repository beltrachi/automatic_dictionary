function isButton(node){
  return node.nodeName == "INPUT" && node.type.toLocaleUpperCase() == "BUTTON"
}
function isCheckbox(node){
  return node.nodeName == "INPUT" && node.type.toLocaleUpperCase() == "CHECKBOX"
}

// Localize texts
for (const node of document.querySelectorAll('[data-i18n]')) {
  let id = node.dataset.i18n;
  var text = browser.i18n.getMessage(id);
  if(isButton(node)){
    node.value = text;
  }else{
    node.appendChild(document.createTextNode(text));
  }
}

async function getStoredValue(key){
  var data = await browser.storage.local.get(key);
  return data[key];
}

async function setNode(node){
  let pref = node.dataset.preference;
  let value = await getStoredValue(pref);
  switch(node.nodeName) {
  case "SELECT":
    var option = node.querySelectorAll('[value='+value+']')[0];
    option.selected = true;
    break;
  case "INPUT":
    if(isCheckbox(node)){
      node.checked = value;
    }else{
      node.value = value;
    }
    break;
  default:
    console.error("Unknown node type " + node.nodeName);
    console.error(node);
  }
}

for (const node of document.querySelectorAll('[data-preference]')) {
  setNode(node);
}

function setValue(key, value){
  var data = {};
  data[key] = value;
  return browser.storage.local.set(data);
}

function saveChanges(){
  var elements = document.forms[0].elements;
  for (i = 0; i < elements.length; i++) {
    var item = elements[i];
    var key = item.dataset.preference;
    var value = item.value;
    if (isButton(item)) {
      continue;
    }
    if (isCheckbox(item)){
      value = item.checked;
    }
    setValue(key, value);
  }
}

window.document.getElementById('saveButton').addEventListener('click', saveChanges);
