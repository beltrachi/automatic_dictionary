// my-custom-environment
const NodeEnvironment = require('jest-environment-node').TestEnvironment;

var { window, browser } = require('./thunderbird_mocks.cjs')

class JestThunderbirdEnvironment extends NodeEnvironment {
  constructor(config, context) {
    super(config, context);
    this.testPath = context.testPath;
    this.docblockPragmas = context.docblockPragmas;
  }

  async setup() {
    await super.setup();
    this.global.window = window;
    this.global.browser = browser;
    // await someSetupTasks(this.testPath);
    // this.global.someGlobalObject = createGlobalObject();
  }

  async teardown() {
    // this.global.someGlobalObject = destroyGlobalObject();
    // await someTeardownTasks();
    await super.teardown();
  }

  runScript(script) {
    return super.runScript(script);
  }

  async handleTestEvent(event, state) {
    if (event.name === 'test_start') {
      // ...
    }
  }
}

module.exports = JestThunderbirdEnvironment;