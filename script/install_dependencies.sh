#!/bin/bash

set -ex

sudo apt-get update
sudo apt-get install -y xvfb zip unzip fluxbox xserver-xephyr curl \
 imagemagick libmagickwand-dev xvfb unzip xdotool

# Install Tesseract OCR from default repositories
sudo apt-get install -y tesseract-ocr tesseract-ocr-eng

sudo apt-get install -y git-core curl zlib1g-dev build-essential libssl-dev \
  libreadline-dev libyaml-dev libsqlite3-dev sqlite3 libxml2-dev libxslt1-dev \
  libcurl4-openssl-dev libffi-dev dbus-x11

# Install thunderbird dependencies
apt-get install -y `apt-cache depends thunderbird | awk '/Depends:/{print$2}'`

PREV_PATH=$(pwd)

cd test/integration/
bundle install -j 3
ruby -v

cd $PREV_PATH