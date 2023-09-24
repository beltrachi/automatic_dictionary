const { execSync } = require('child_process');
const core = require('@actions/core');

exports.preCommit = (props) => {
  core.startGroup(`Running \`build.sh\``);
  execSync(
    './build.sh', {
      stdio: ['inherit', 'inherit', 'inherit'],
      encoding: 'utf-8'
    }
  );
  core.endGroup();
};
