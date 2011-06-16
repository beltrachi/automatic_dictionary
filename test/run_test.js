load("./../chrome/content/lib.js");
load("./../chrome/content/lib/sorted_set.js");
load("./../chrome/content/lib/lru_hash.js");
load("./../chrome/content/lib/lru_hash_v2.js");
load("./../chrome/content/lib/shared_hash.js");
load("lib/tools.js");

logger = Tools.Logger("performance");

load("lib/assertions.js");

var start = Date.now();
print('start testing \n');

logger.info("### Unit tests");

load("units/sorted_set_test.js");

load("units/lru_hash_test.js");

load("units/ad_test.js");

logger.info("### Performance tests");

load("performance/sorted_set_test.js");

load("performance/lru_hash_test.js");

print("Tests elapsed "+(Date.now() - start) + " ms. "+assert.counters.assertions + " assertions, "+ assert.counters.failures + " failures");