#!/bin/bash

set -ex

sudo apt-get update
sudo apt-get install -y xvfb zip unzip fluxbox xserver-xephyr curl
sudo apt-get install -y imagemagick libmagickwand-dev xvfb unzip imagemagick xdotool tesseract-ocr

sudo apt-get install -y git-core curl zlib1g-dev build-essential libssl-dev libreadline-dev libyaml-dev libsqlite3-dev sqlite3 libxml2-dev libxslt1-dev libcurl4-openssl-dev libffi-dev

PREV_PATH=$(pwd)

cd test/integration/
gem install bundler -v "~> 1.17"
bundle install -j 3
ruby -v

cd $PREV_PATH