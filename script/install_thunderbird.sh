#!/bin/bash

set -ex

if [ "$THUNDERBIRD_VERSION" == "beta" ]; then
    PACKAGE_URL="https://download.mozilla.org/?product=thunderbird-beta-latest&os=linux64&lang=en-US"
else
    STABLE_URL="https://download.mozilla.org/?product=thunderbird-${THUNDERBIRD_VERSION}-SSL&os=linux64&lang=en-US"
    PACKAGE_URL=$STABLE_URL
fi

# Using latest to have latest dependencies
sudo apt-get install -y software-properties-common
apt-get install -y `apt-cache depends thunderbird | awk '/Depends:/{print$2}'`
curl -L $PACKAGE_URL -o thunderbird.tar.bz2
tar -xvf thunderbird.tar.bz2 -C /tmp/
echo "export PATH=/tmp/thunderbird/:\$PATH" >> ~/.bash_profile
