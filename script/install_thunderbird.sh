#!/bin/bash

set -ex

# ESR releases are not downloadable like latest or beta. ESR are the versions included
# in the package manager of each stable distro.
if [ "$THUNDERBIRD_VERSION" == "esr" ]; then
  apt-get update && apt-get install -y thunderbird
  exit 0
fi

# URL returns the right file for "beta-latest" or "latest", or even a specific version "78.11.0"
# Note: Mozilla now uses .tar.xz format instead of .tar.bz2
PACKAGE_URL="https://download.mozilla.org/?product=thunderbird-${THUNDERBIRD_VERSION}-SSL&os=linux64&lang=en-US"

# Install xz-utils for extracting .tar.xz files
sudo apt-get update && sudo apt-get install -y xz-utils

DOWNLOAD_DIR="/tmp/thunderbird-download"
mkdir -p $DOWNLOAD_DIR
cd $DOWNLOAD_DIR
wget --content-disposition $PACKAGE_URL
tar -xvf /tmp/thunderbird-download/* -C /tmp/
echo "export PATH=/tmp/thunderbird/:\$PATH" >> ~/.bash_profile
