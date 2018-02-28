#!/bin/bash

set -ex

sudo apt-get update
sudo apt-get install -y xvfb zip unzip fluxbox xserver-xephyr
sudo apt-get install -y imagemagick libmagickwand-dev xvfb unzip imagemagick xdotool tesseract-ocr

if [ "$THUNDERBIRD_VERSION" == "" ] || [ "$THUNDERBIRD_VERSION" == "stable" ]; then
    sudo apt-get install -y thunderbird
else
    if [ "$THUNDERBIRD_VERSION" == "beta" ]; then
        sudo apt-get install -y software-properties-common python-software-properties
        sudo add-apt-repository -y ppa:mozillateam/thunderbird-next
        sudo apt-get update
        sudo apt-get install -y thunderbird
    else
        echo "Something happened, the version is not there"
        exit 12
    fi
fi

sudo apt-get install -y git-core curl zlib1g-dev build-essential libssl-dev libreadline-dev libyaml-dev libsqlite3-dev sqlite3 libxml2-dev libxslt1-dev libcurl4-openssl-dev python-software-properties libffi-dev

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
