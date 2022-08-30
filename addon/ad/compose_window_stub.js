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

Object.assign(
    ComposeWindowStub.prototype,
    Shutdownable);

Object.assign(ComposeWindowStub.prototype, {
    shutdown_chain: [],
    name: "ComposeWindowStub",
    logger: null,

    setListeners: function () {},
    getCurrentLangs: async function () {},
    recipients: async function (_recipientType) {
        return [];
    },
    changeLabel: async function (str) {},
    changeLanguages: async function(){},
    canSpellCheck: async function(){}
});
