//Test SortedSet

const { esmImport } = require('../utils.js');
const { apply }  = esmImport("./../addon/lib/sorted_set.js");

var AutomaticDictionary = { Lib: {} };
apply(AutomaticDictionary);

test('SortedSet', () => {
  var ss = AutomaticDictionary.Lib.SortedSet();

  ss.push("a");
  ss.push("b");
  ss.push("c");

  expect(ss.first()).toBe("a");
  expect(ss.toArray()[0]).toBe("a");
  expect(ss.toArray()[1]).toBe("b");
  expect(ss.toArray()[2]).toBe("c");

  ss.remove("b");
  expect(ss.first()).toBe("a");
  expect(ss.contains("b")).toBe(false);
  expect(ss.toArray()[0]).toBe("a");
  expect(ss.toArray()[1]).toBe("c");


  expect(ss.toArray()[0]).toBe("a");
  expect(ss.toArray()[1]).toBe("c");
  expect(ss.size()).toBe(2);

  ss.push("fooo");
  expect(ss.remove("fooo")).toBe(true);

  expect(ss.first()).toBe("a");
  ss.remove("a");
  ss.remove("a");
  expect(ss.first()).toBe("c");
  expect(ss.size()).toBe(1);

  ss.push("b");
  //Adding c removes old one
  ss.push("c");
  expect(ss.first()).toBe("b");
  expect(ss.size()).toBe(2);
  expect(ss.toArray()[0]).toBe("b");
  expect(ss.toArray()[1]).toBe("c");
});