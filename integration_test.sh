#!/bin/bash

set -ex
# This script executes thunderbird installing the extension and runs it.
source script/setup_test_env.sh

PROFILE_NAME="TestUser"
PROFILE_PATH="$(mktemp -d)"

thunderbird -CreateProfile "$PROFILE_NAME $PROFILE_PATH"

# Update build to lastest
./build.sh
./script/install_extension.sh --path $PROFILE_PATH --extension automatic_dictionary.xpi

# Install spanish dictionary
wget "https://addons.mozilla.org/thunderbird/downloads/latest/spanish-spain-dictionary/addon-3554-latest.xpi?src=dp-btn-primary" -O spanish-dictionary.xpi
./script/install_extension.sh --path $PROFILE_PATH --extension spanish-dictionary.xpi

thunderbird --profile "$PROFILE_PATH" -offline --no-remote &
#exit
cd test/integration/
ruby -v
bundle exec rspec spec/automatic_dictionary
