
function stringifyRecipientsGroup(arr) {
  var sorted = [];
  for (var k in arr) {
    sorted.push(arr[k]);
  }
  sorted.sort();
  return sorted.toString();
}

export const Recipients = function (combination) {
  this.to = combination.to
  this.cc = combination.cc
}

Recipients.prototype = {
  getKey: function () {
    var key = stringifyRecipientsGroup(this.to);
    if (this.cc && this.cc.length > 0) {
      key += "[cc]" + stringifyRecipientsGroup(this.cc);
    }
    return key;
  }
}
