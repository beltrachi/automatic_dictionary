import { jest } from '@jest/globals'

export function mockComposeWindow(compose_window, options) {
    options.spellchecker_enabled = options.spellchecker_enabled || true
    options.getLangs = function(){
        return options.langs
    }
    options.setLangs = function(langs){
        options.langs = langs
    }

    if(!options.langs){
        options.langs = []
        if(options.lang){
            options.langs = [options.lang]
        }
    }
    compose_window.recipients = jest.fn(function (type) {
        type = type || 'to';
        return options.recipients[type] || [];
    });
    compose_window.changeLabel = jest.fn();
    compose_window.showMessage = jest.fn();
    compose_window.changeLanguage = jest.fn(function (lang) {
        options.lang = lang;
        options.langs = [lang];
    });
    compose_window.changeLanguages = jest.fn(function (langs) {
        options.lang = langs[0]
        options.langs = langs;
    });
    compose_window.getCurrentLang = jest.fn(function () { return options.langs[0] });
    compose_window.getCurrentLangs = jest.fn(function () {
        return [options.lang]
    });
    compose_window.canSpellCheck = jest.fn(async function () { return options.spellchecker_enabled });
}

export async function benchmark(milis, func) {
    var start = Date.now();

    await func();
    var elapsed = (Date.now() - start);
    if (elapsed > milis) {
        var msg = "Benchmark failed: elapsed " + elapsed + " ms (max was " + milis + ")";
        if (func.name) {
            msg = func.name + ": " + msg
        }
        throw msg;
    }
}