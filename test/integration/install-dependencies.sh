#!/bin/bash

set -ex

sudo apt-get update
# Ruby dependencies
sudo apt-get install -y git-core curl zlib1g-dev build-essential libssl-dev libreadline-dev libyaml-dev libsqlite3-dev sqlite3 libxml2-dev libxslt1-dev libcurl4-openssl-dev python-software-properties libffi-dev

# Interactor dependencies
sudo apt-get install -y imagemagick libmagickwand-dev xvfb unzip imagemagick xdotool tesseract-ocr

git clone https://github.com/rbenv/rbenv.git ~/.rbenv

echo 'export PATH="$HOME/.rbenv/bin:$PATH"' >> ~/.bashrc

echo 'eval "$(rbenv init -)"' >> ~/.bashrc

source ~/.bashrc

git clone https://github.com/rbenv/ruby-build.git ~/.rbenv/plugins/ruby-build

~/.rbenv/bin/rbenv install

gem install bundler

bundle install