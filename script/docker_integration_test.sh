#!/bin/bash

set -ex

docker image inspect automatic_dictionary:${THUNDERBIRD_VERSION} ||
  docker build --pull=true --no-cache --build-arg THUNDERBIRD_VERSION=$THUNDERBIRD_VERSION -t automatic_dictionary:${THUNDERBIRD_VERSION} .

if [ "$DEVEL_MODE" = "1" ]; then
   DEVEL_MODE_MODIFIERS="-v /tmp/.X11-unix:/tmp/.X11-unix -e DISPLAY -e DEBUG=1 -e LOCAL_DEBUG=1 -v $PWD:/app "
fi

docker run --cap-add=SYS_PTRACE --cpus 2 -ti $DEVEL_MODE_MODIFIERS automatic_dictionary:${THUNDERBIRD_VERSION} /bin/bash -l -c "./integration_test.sh"
