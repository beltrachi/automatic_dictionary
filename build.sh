#!/bin/bash
set -ex

APP_NAME="automatic_dictionary"

echo "Executing before build step..."
./update_version.sh

echo "Generating $APP_NAME.xpi..."
zip -r $APP_NAME.xpi addon/*
