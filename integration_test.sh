#!/bin/bash
# This script executes thunderbird installing the extension and runs it.

set -ex
source script/setup_test_env.sh
source ~/.bash_profile

cd test/integration/
bundle install
bundle exec rspec spec/automatic_dictionary
