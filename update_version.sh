#!/bin/bash

set -ex
# Extract version from manifest.json and set to version.js
VERSION=`ruby -e "require 'json'; puts JSON.load(File.read('addon/manifest.json'))['version']"`
JS_FILE='addon/version.js'
TMP_FILE=${JS_FILE}'.tmp'
cat $JS_FILE | sed -e "s/version='[^']\+/version='${VERSION}/g" > $TMP_FILE
mv -f $TMP_FILE $JS_FILE
rm -f $TMP_FILE
