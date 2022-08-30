import { jest } from '@jest/globals'

export function mockComposeWindow(compose_window, options) {
    function shuffleArray(array) {
        let curId = array.length;
        // There remain elements to shuffle
        while (0 !== curId) {
            // Pick a remaining element
            let randId = Math.floor(Math.random() * curId);
            curId -= 1;
            // Swap it with the current element.
            let tmp = array[curId];
            array[curId] = array[randId];
            array[randId] = tmp;
        }
        return array;
    }

    options.spellchecker_enabled = options.spellchecker_enabled || true
    options.getLangs = function () {
        return options.langs
    }
    options.setLangs = function (langs) {
        // We randomize the order in which languages are provided to make sure
        // implementation do not depend on that.
        options.langs = shuffleArray(langs);
    }

    if (!options.langs) {
        options.langs = []
    }
    compose_window.recipients = jest.fn(async function (type) {
        type = type || 'to';
        return options.recipients[type] || [];
    });
    compose_window.changeLabel = jest.fn(async function(){});
    compose_window.showMessage = jest.fn();
    compose_window.changeLanguages = jest.fn(function (langs) {
        options.langs = langs;
    });
    compose_window.getCurrentLangs = jest.fn(async function () {
        return options.langs
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