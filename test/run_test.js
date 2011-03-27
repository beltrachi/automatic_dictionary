load("./../chrome/content/lib.js");
load("lib/tools.js");

logger = Tools.Logger("performance");

load("lib/assertions.js");

var start = Date.now();
print('start testing \n');

logger.info("### Unit tests");

load("units/sorted_set_test.js");

load("units/lru_hash_test.js");

logger.info("### Performance tests");

load("performance/sorted_set_test.js");

load("performance/lru_hash_test.js");

print("Tests elapsed "+(Date.now() - start) + " ms. "+assert.counters.assertions + " assertions, "+ assert.counters.failures + " failures");
