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
      logger: LoggerStub,
      logo_url: 'stubbed-logo-url',
      notification_time: 4000
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
      onRecipientsChange: eventEmitterFactory(),
      showNotification: jest.fn(),
      setSpellCheckerLanguage: jest.fn(),
      canSpellCheck: jest.fn().mockResolvedValue(true)
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

  describe('recipients', () => {
    describe('when recipients is a single string', () => {
      it('returns the recipients from that tab', async () => {
        var details = {'to': 'Joe'}
        var compose_window = factory();
        browser.compose.getComposeDetails = jest.fn().mockResolvedValue(details);

        expect(compose_window.recipients()).resolves.toStrictEqual(['Joe']);
      });
    })

    describe('when recipients is an array of strings', () => {
      it('returns the recipients from that tab', async () => {
        var details = {'to': ['Joe']}
        var compose_window = factory();
        browser.compose.getComposeDetails = jest.fn().mockResolvedValue(details);

        expect(compose_window.recipients()).resolves.toStrictEqual(['Joe']);
      });
    })

    describe('when recipients is an array of strings that needs to be normalized', () => {
      it('returns the recipients normalized', async () => {
        var details = {'to': ['Joe <joe@example.com>', 'Big band! <big.+band@example.com']}
        var compose_window = factory();
        browser.compose.getComposeDetails = jest.fn().mockResolvedValue(details);

        expect(compose_window.recipients()).resolves.toStrictEqual(
          ['joe@example.com','big.+band@example.com']);
      });
    })

    describe('when recipients is a compose recipients object', () => {
      //var composeRecipientsFactory = function()
      it('returns the recipients from that tab', async () => {
        var composeDetails = {
          to: [
            { type: 'contact', id: 'contact-recipient-id'},
            { type: 'mailingList', id: 'mailing-list-recipient-id'}
          ]
        }
        browser.compose.getComposeDetails = jest.fn().mockResolvedValue(composeDetails);
        browser.contacts.get = jest.fn().mockResolvedValue({
          properties: { PrimaryEmail: 'contact-email@example.com'}
        })
        browser.mailingLists.get = jest.fn().mockResolvedValue({
          properties: { name: 'mailinglist-email@example.com'}
        });
        var compose_window = factory();

        expect(await compose_window.recipients()).toStrictEqual(
          ["contact-email@example.com", "mailinglist-email@example.com"]);

        expect(browser.compose.getComposeDetails).toHaveBeenCalledWith('stubbed-tab-id');
        expect(browser.contacts.get).toHaveBeenCalledWith('contact-recipient-id');
        expect(browser.mailingLists.get).toHaveBeenCalledWith('mailing-list-recipient-id')
      });
    })
  });

  describe('showMessage', () => {
    it('forwards to compose_ext', async () => {
      var compose_window = factory();
      await compose_window.showMessage('message', {buttons: []})

      expect(browser.compose_ext.showNotification).toHaveBeenCalledWith(
        'stubbed-tab-id',
        'message',
        {
          logo_url: 'stubbed-logo-url',
          buttons: []
        }
      )
    })
  });

  describe('changeLabel', () => {
    it('forwards to compose_ext', async () => {
      var compose_window = factory();
      await compose_window.changeLabel('message')

      expect(browser.compose_ext.showNotification).toHaveBeenCalledWith(
        'stubbed-tab-id',
        'message',
        {
          logo_url: 'stubbed-logo-url',
          notification_time: 4000
        }
      )
    })
  });

  describe('changeLanguage', () => {
    it('sets spellchecker language via compose_ext', async () => {
      var compose_window = factory();
      await compose_window.changeLanguage('en')

      expect(browser.compose_ext.setSpellCheckerLanguage).toHaveBeenCalledWith('stubbed-tab-id', 'en')
    })
  })

  describe('canSpellCheck', () => {
    it('returns true when spellchecker is available', async () => {
      var compose_window = factory();
      expect(await compose_window.canSpellCheck()).toBe(true)

      expect(browser.compose_ext.canSpellCheck).toHaveBeenCalledWith('stubbed-tab-id')
    })
  })
})