#!/bin/bash

set -ex

BETA_URL="https://download.mozilla.org/?product=thunderbird-beta-latest&os=linux64&lang=en-US"
STABLE_URL="https://download.mozilla.org/?product=thunderbird-68.0-SSL&os=linux64&lang=en-US"

if [ "$THUNDERBIRD_VERSION" == "beta" ]; then
    PACKAGE_URL=$BETA_URL
else
    PACKAGE_URL=$STABLE_URL
fi

# Using latest to have latest dependencies
sudo apt-get install -y software-properties-common python-software-properties
sudo add-apt-repository -y ppa:mozillateam/thunderbird-next
sudo apt-get update
apt-get install -y `apt-cache depends thunderbird | awk '/Depends:/{print$2}'`
curl -L $PACKAGE_URL -o thunderbird.tar.bz2
tar -xvf thunderbird.tar.bz2 -C /tmp/
echo "export PATH=/tmp/thunderbird/:\$PATH" >> ~/.bash_profile
