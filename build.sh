#!/bin/bash
set -ex

APP_NAME="automatic_dictionary"

echo "Generating $APP_NAME.xpi..."
rm $APP_NAME.xpi || true
cd addon
zip -r ../$APP_NAME.xpi *
cd ..
