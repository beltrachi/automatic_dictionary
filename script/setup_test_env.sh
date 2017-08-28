#!/bin/bash

set -ex

#sudo apt-get update
#sudo apt-get install -y xvfb thunderbird unzip fluxbox

if [ "$DEBUG" -eq "1" ]; then
    Xephyr -ac -screen 1280x960x24 :99 &
else
    Xvfb :99 -screen 0 1280x960x24 &
fi
export DISPLAY=:99
sleep 1
# Start window manager to focus window correctly.
fluxbox &
sleep 1

