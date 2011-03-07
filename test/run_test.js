load("./../chrome/content/lib.js");
load("lib/tools.js");

logger = Tools.Logger("performance");

load("lib/assertions.js");

var start = Date.now();
print('start testing \n');

load("units/sorted_set_test.js");

load("units/lru_hash_test.js");

print("Tests elapsed "+(Date.now() - start) + " ms. Assertions: "+assert.counter);
