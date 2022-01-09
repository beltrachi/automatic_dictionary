/**
 * @jest-environment ./test/helpers/jest-thunderbird-environment.cjs
 */

import { ComposeWindowStub } from './../../../addon/ad/compose_window_stub';
import { ComposeWindow } from "./../../../addon/ad/compose_window";

describe('ComposeWindowStub', () => {
  var factory = function () {
    return new ComposeWindowStub({ ad: {} });
  };
  it('It implements all ComposeWindow public methods and attributes', () => {
    var compose_window_stub = factory();
    for (var method in ComposeWindow.prototype) {
      expect(compose_window_stub[method]).toBeDefined();
      console.log(method)
      // Both methods are async?
      expectBothAsyncMethods(ComposeWindow.prototype[method], compose_window_stub[method]);
    }
  });

  it('recipients returns empty array', () => {
    var compose_window_stub = factory();
    expect(compose_window_stub.recipients()).resolves.toStrictEqual([])
  });
});

function expectBothAsyncMethods(method, compose_window_stub_method) {
  if (method && method.constructor && method.constructor.name) {
    expect(method.constructor.name).toStrictEqual(
      compose_window_stub_method.constructor.name);
  }
}
