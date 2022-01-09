import { Shutdownable } from "./../lib/shutdownable.js";

/*
 *
 * ComposeWindowStub not attached to any window
 *
 **/
export const ComposeWindowStub = (function (params) {
    this.ad = params.ad;
    this.params = params;
    this.shutdown_chain = [];
});

ComposeWindowStub.canManageWindow = function (window) {
    //We can manage the messengercompose window.
    return false;
};

Object.assign(
    ComposeWindowStub.prototype,
    Shutdownable);

Object.assign(ComposeWindowStub.prototype, {
    shutdown_chain: [],
    name: "ComposeWindowStub",
    logger: null,

    setListeners: function () {
        // Nothing to be done
    },
    getCurrentLang: function () { },

    recipients: function (recipientType) {
        return [];
    },

    changeLabel: function (str) { }

});
