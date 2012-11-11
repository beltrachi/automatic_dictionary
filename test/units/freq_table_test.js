var ft = new AutomaticDictionary.Lib.FreqTable();

assert.strictEqual(null,ft.getFirst());

ft.add("a");
ft.add("a");
ft.add("b");

assert.equal("a",ft.getFirst());
ft.add("b");
ft.add("b");
logger.info(ft.printOrder());
assert.equal("b",ft.getFirst());

ft.remove("b");
ft.remove("b");
logger.info(ft.printOrder());
assert.equal("a",ft.getFirst());

ft.remove("b");
assert.equal("a",ft.getFirst());

ft.remove("a");
ft.remove("a");
assert.strictEqual(null,ft.getFirst());

