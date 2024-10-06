#!/bin/bash

set -ex

# ESR releases are not downloadable like latest or beta. ESR are the versions included
# in the package manager of each stable distro.
if [ "$THUNDERBIRD_VERSION" == "esr" ]; then
  apt-get install -y thunderbird
  exit 0
fi

# URL returns the right file for "beta-latest" or "latest", or even a specific version "78.11.0"
PACKAGE_URL="https://download.mozilla.org/?product=thunderbird-${THUNDERBIRD_VERSION}-SSL&os=linux64&lang=en-US"

curl -L $PACKAGE_URL -o thunderbird.tar.bz2
tar -xvf thunderbird.tar.bz2 -C /tmp/
echo "export PATH=/tmp/thunderbird/:\$PATH" >> ~/.bash_profile
