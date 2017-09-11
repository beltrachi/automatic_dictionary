#!/bin/bash
# This script executes thunderbird installing the extension and runs it.

set -ex
source script/setup_test_env.sh
source ~/.bash_profile

PROFILE_NAME="TestUser"
PROFILE_PATH="$(mktemp -d)"

tar -xvf test/integration/fixtures/test-profile.tar.gz -C $PROFILE_PATH

# Update build to lastest
./build.sh
./script/install_extension.sh --path $PROFILE_PATH --extension automatic_dictionary.xpi

# Install spanish dictionary
ls spanish-dictionary.xpi || \
    curl -L "https://addons.mozilla.org/thunderbird/downloads/latest/spanish-spain-dictionary/addon-3554-latest.xpi?src=dp-btn-primary" -o spanish-dictionary.xpi

./script/install_extension.sh --path $PROFILE_PATH --extension spanish-dictionary.xpi

thunderbird --profile "$PROFILE_PATH" --no-remote &

cd test/integration/
bundle install
bundle exec rspec spec/automatic_dictionary
