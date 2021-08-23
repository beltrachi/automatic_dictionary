
function stringifyRecipientsGroup(arr) {
  var sorted = [];
  for (var k in arr) {
    sorted.push(arr[k]);
  }
  sorted.sort();
  return sorted.toString();
}

export const Recipients = {
  getKeyForRecipients: function (recipients) {
    var key = stringifyRecipientsGroup(recipients.to);
    if (recipients.cc && recipients.cc.length > 0) {
      key += "[cc]" + stringifyRecipientsGroup(recipients.cc);
    }
    return key;
  }
}