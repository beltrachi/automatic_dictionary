var AutomaticDictionary = { Lib: {} };

import { apply as freq_table_apply } from "./../../addon/lib/freq_table";
freq_table_apply(AutomaticDictionary);

test('FreqTable', () => {
  var ft = new AutomaticDictionary.Lib.FreqTable();
  expect(ft.getFirst()).toBeNull();

  ft.add("a");
  ft.add("a");
  ft.add("b");

  expect(ft.getFirst()).toBe("a")
  ft.add("b");
  ft.add("b");
  expect(ft.getFirst()).toBe("b")

  ft.remove("b");
  ft.remove("b");
  expect(ft.getFirst()).toBe("a")

  ft.remove("b");
  expect(ft.getFirst()).toBe("a")

  ft.remove("a");
  ft.remove("a");
  expect(ft.getFirst()).toBeNull();
});
