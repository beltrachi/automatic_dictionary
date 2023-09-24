interface Props {
  tag: string; // Next tag e.g. v1.12.3
  version: string; // Next version e.g. 1.12.3
}

const core = require("@actions/core");
const exec = require("@actions/exec");

async function run() {
  try {
    // Set the src-path
    const src = __dirname + "./../../";
    core.debug(`src: ${src}`);

    // Execute bash script
    await exec.exec(`${src}/build.sh`);

  } catch (error) {
    core.setFailed(error.message);
  }
}

export function preCommit(props: Props): void {
  run();
}
