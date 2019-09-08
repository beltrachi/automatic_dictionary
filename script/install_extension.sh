#!/bin/bash

set -ex

# Adds an extension to a thunderbird profile
# Example: install_extension.sh --path /foo --extension file.xpi

# Parse options
while [[ $# -gt 1 ]]
do
    key="$1"

    case $key in
        -e|--extension)
            EXTENSION="$2"
            shift # past argument
            ;;
        -p|--path)
            PROFILE_PATH="$2"
            shift # past argument
            ;;
        *)
            # unknown option
            ;;
    esac
    shift # past argument or value
done

if [ -z "$EXTENSION" ] || [ -z "$PROFILE_PATH" ]; then
    echo "Extension and path parameters required."
    exit 1;
fi

mkdir -p "$PROFILE_PATH/extensions"

TMP_DIR=$(mktemp -d)

cp $EXTENSION $TMP_DIR/tmp.xpi
unzip "$TMP_DIR/tmp.xpi" -d $TMP_DIR
rm $TMP_DIR/tmp.xpi

EXTENSION_ID=$(ruby -e "require 'json'; puts JSON.load(File.read('$TMP_DIR/manifest.json'))['applications']['gecko']['id']")

mkdir "$PROFILE_PATH/extensions/$EXTENSION_ID"
mv $TMP_DIR/* "$PROFILE_PATH/extensions/$EXTENSION_ID"

echo $EXTENSION $PROFILE_PATH

rm -rf $TMP_DIR

echo "Extension $EXTENSION installed correctly"