#!/bin/bash

set -ex

BETA_URL="https://download.mozilla.org/?product=thunderbird-beta-latest&os=linux64&lang=en-US"

if [ "$THUNDERBIRD_VERSION" == "" ] || [ "$THUNDERBIRD_VERSION" == "stable" ]; then
    sudo apt-get install -y thunderbird
else
    if [ "$THUNDERBIRD_VERSION" == "beta" ]; then
        sudo apt-get install -y software-properties-common python-software-properties
        sudo add-apt-repository -y ppa:mozillateam/thunderbird-next
        sudo apt-get update
        apt-get install -y `apt-cache depends thunderbird | awk '/Depends:/{print$2}'`
        curl -L $BETA_URL -o thunderbird.tar.bz2
        tar -xvf thunderbird.tar.bz2 -C /tmp/
        echo "export PATH=/tmp/thunderbird/:\$PATH" >> ~/.bash_profile
    else
        echo "Something happened, the version is not there"
        exit 12
    fi
fi
