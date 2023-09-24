const { execSync } = require('child_process');

exports.preCommit = (props) => {
  execSync(
    './build.sh', {
      stdio: ['inherit', 'inherit', 'inherit'],
      encoding: 'utf-8'
    }
  );
};
