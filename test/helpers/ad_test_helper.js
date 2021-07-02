import { jest } from '@jest/globals'

export function mockComposeWindow(compose_window, options){
    options.spellchecker_enabled = options.spellchecker_enabled || true

    compose_window.recipients = jest.fn(function(type){
        type = type || 'to';
        return options.recipients[type] || [];
    });
    compose_window.changeLabel = jest.fn();
    compose_window.showMessage = jest.fn();
    compose_window.changeLanguage = jest.fn(function(lang){ options.lang = lang; });
    compose_window.getCurrentLang = jest.fn(function(){ return options.lang });
    compose_window.canSpellCheck = jest.fn(async function(){ return options.spellchecker_enabled });
}
