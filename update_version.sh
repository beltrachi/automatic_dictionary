#!/bin/bash
# Extract versin from install.rdf and set to version.js
VERSION=`grep -Po '(:?em:version>)([^\<]+)' install.rdf | sed -e 's/em:version>//g'`
JS_FILE='chrome/content/version.js'
TMP_FILE=${JS_FILE}'.tmp'
cat $JS_FILE | sed -e "s/version='[^']\+/version='${VERSION}/g" > $TMP_FILE
mv -f $TMP_FILE $JS_FILE
rm -f $TMP_FILE
