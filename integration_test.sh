#!/bin/bash

set -ex
source script/setup_test_env.sh
# load profile for rbenv to work
source ~/.bash_profile
export DEBUG=1

# Set log level to debug
sed -i 's/\s*"logLevel":.*/"logLevel":"debug",/g' chrome/content/ad.js
sed -i 's/\s*"saveLogFile":.*/"saveLogFile":"true",/g' chrome/content/ad.js

cd test/integration/
bundle install
bundle exec rspec spec/automatic_dictionary
bundle exec rspec spec/lib
