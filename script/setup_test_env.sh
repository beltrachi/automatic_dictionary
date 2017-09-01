#!/bin/bash

set -ex

if [ "$DEBUG" = true ]; then
    Xephyr -ac -screen 1280x960x24 :99 &
else
    Xvfb :99 -screen 0 1280x960x24 &
fi
export DISPLAY=:99
sleep 1
# Start window manager to focus window correctly.
fluxbox &
sleep 1

ls greenmail-standalone-1.5.5.jar || \
    curl http://central.maven.org/maven2/com/icegreen/greenmail-standalone/1.5.5/greenmail-standalone-1.5.5.jar -o greenmail-standalone-1.5.5.jar

echo "127.0.0.1   mail.com mail.mail.com smtp.mail.com" >> /etc/hosts

java -Dgreenmail.setup.test.all \
     -Dgreenmail.users=test:testtest@mail.com \
     -jar greenmail-standalone-1.5.5.jar &

sleep 10
