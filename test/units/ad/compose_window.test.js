/**
 * @jest-environment ./test/helpers/jest-thunderbird-environment.cjs
 */

import { apply } from "./../../../addon/ad/compose_window";
import { LoggerStub } from './../../../addon/lib/logger_stub.js';

var AutomaticDictionary = {
  Lib: {},
  window_managers: []
};
//Helper function to copy prototypes
AutomaticDictionary.extend = function (destination,source) {
  return Object.assign(destination, source);
}

apply(AutomaticDictionary);

import { jest } from '@jest/globals'

describe('ComposeWindow', () => {
  var factory = function(){
    return new AutomaticDictionary.ComposeWindow({
      ad: {
        window: { id: 'stubbed-window-id' },
        addEventListener: jest.fn()
      },
      logger: LoggerStub
    });
  };
  var eventEmitterFactory = function(){
    return {
      addListener: jest.fn(),
      addEventListener: jest.fn(),
      removeListener: jest.fn(),
      removeEventListener: jest.fn()
    }
  }
  beforeEach(() => {
    browser.compose_ext = {
      onLanguageChange: eventEmitterFactory(),
      onRecipientsChange: eventEmitterFactory()
    };
    browser.windows.onFocusChanged = eventEmitterFactory();
    browser.windows.get = jest.fn().mockResolvedValue({
      tabs: [{id: 'stubbed-tab-id' } ]
    })
  })

  describe('canManageWindow', () => {
    it("detects matching window locations", () => {
      var matching_urls = [
        'chrome://whatever/messengercompose.xul',
        'chrome://whatever/messengercompose.xhtml'
      ]
      matching_urls.forEach((url) => {
        var window_stub = { document: { location: url } };
        expect(AutomaticDictionary.ComposeWindow.canManageWindow(window_stub)).toBe(true);
      })
    });

    it('rejects other locations', () => {
      var rejected_urls = [
        'chrome://messenger/content/messenger.xhmtl',
        'chrome://mozapps/content/extensions/aboutaddons.html'
      ];
      rejected_urls.forEach((url) => {
        var window_stub = { document: { location: url } };
        expect(AutomaticDictionary.ComposeWindow.canManageWindow(window_stub)).toBe(false);
      })
    });
  });

  describe('setListeners', () => {
    it('sets listeners on compose_ext', () => {
      var compose_window = factory();
      compose_window.setListeners();
      expect(browser.compose_ext.onLanguageChange.addListener).toHaveBeenCalled()
      expect(browser.compose_ext.onRecipientsChange.addListener).toHaveBeenCalled()
      expect(browser.windows.onFocusChanged.addListener).toHaveBeenCalled();
    });
  });

  describe('getCurrentLang', () => {
    it('returns what compose_ext returns', async () => {
      var compose_window = factory();
      browser.compose_ext.getCurrentLanguage = jest.fn().mockReturnValue('ca')

      expect(await compose_window.getCurrentLang()).toBe('ca')
      expect(browser.compose_ext.getCurrentLanguage).toHaveBeenCalledWith('stubbed-tab-id')
    })
  });

  describe('getTabId', () => {
    it('returns what compose_ext returns', async () => {
      var compose_window = factory();

      expect(compose_window.getTabId()).resolves.toBe('stubbed-tab-id');
      expect(browser.windows.get).toHaveBeenCalledWith('stubbed-window-id', {populate: true})
    })
  });


})