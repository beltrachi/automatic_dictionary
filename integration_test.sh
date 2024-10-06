#!/bin/bash

set -ex
source script/setup_test_env.sh
# load profile for rbenv to work
source ~/.bash_profile || true
export DEBUG=1

# Limit tesseract multicore to make OCR predictable
export OMP_THREAD_LIMIT=1

# Set log level to debug
sed -i 's/"logLevel":.*/"logLevel":"debug",/g' addon/ad.js

rm -rf test/tmp/*
cd test/integration/
bundle install -j 3
bundle exec rspec spec/automatic_dictionary spec/lib
