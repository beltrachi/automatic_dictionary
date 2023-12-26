#!/bin/bash

set -ex

sudo apt-get update
sudo apt-get install -y xvfb zip unzip fluxbox xserver-xephyr curl \
 imagemagick libmagickwand-dev xvfb unzip xdotool

# Tesseract 5
sudo apt-get install -y apt-transport-https lsb-release
echo "deb https://notesalexp.org/tesseract-ocr5/$(lsb_release -cs)/ $(lsb_release -cs) main" \
| sudo tee /etc/apt/sources.list.d/notesalexp.list > /dev/null
sudo apt-get update -oAcquire::AllowInsecureRepositories=true
sudo apt-get install -y --allow-unauthenticated notesalexp-keyring -oAcquire::AllowInsecureRepositories=true
sudo apt-get update
sudo apt-get install -y tesseract-ocr --allow-unauthenticated

sudo apt-get install -y git-core curl zlib1g-dev build-essential libssl-dev \
  libreadline-dev libyaml-dev libsqlite3-dev sqlite3 libxml2-dev libxslt1-dev \
  libcurl4-openssl-dev libffi-dev

# Install thunderbird dependencies
sudo apt-get install -y software-properties-common
apt-get install -y `apt-cache depends thunderbird | awk '/Depends:/{print$2}'`

PREV_PATH=$(pwd)

cd test/integration/
bundle install -j 3
ruby -v

cd $PREV_PATH