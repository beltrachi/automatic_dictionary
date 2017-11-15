#!/bin/bash

set -ex

sudo apt-get update
sudo apt-get install -y xvfb thunderbird zip unzip fluxbox xserver-xephyr
sudo apt-get install -y imagemagick libmagickwand-dev xvfb unzip imagemagick xdotool tesseract-ocr

sudo apt-get install -y git-core curl zlib1g-dev build-essential libssl-dev libreadline-dev libyaml-dev libsqlite3-dev sqlite3 libxml2-dev libxslt1-dev libcurl4-openssl-dev python-software-properties libffi-dev openjdk-8-jre-headless

PREV_PATH=$(pwd)

cd
ls .rbenv || git clone git://github.com/sstephenson/rbenv.git .rbenv
echo 'export PATH="$HOME/.rbenv/bin:$PATH"' >> ~/.bash_profile
echo 'eval "$(rbenv init -)"' >> ~/.bash_profile

ls ~/.rbenv/plugins/ruby-build || \
    git clone git://github.com/sstephenson/ruby-build.git ~/.rbenv/plugins/ruby-build
echo 'export PATH="$HOME/.rbenv/plugins/ruby-build/bin:$PATH"' >> ~/.bash_profile
source ~/.bash_profile

cd $PREV_PATH

cd test/integration/
rbenv install -s `cat .ruby-version`
gem install bundler
bundle install
ruby -v
