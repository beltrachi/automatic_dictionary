#!/bin/bash

set -ex

# Recreate daily to get latest thunderbird app
DOCKER_IMAGE="automatic_dictionary:${THUNDERBIRD_VERSION}-$(date -I)"

docker image inspect $DOCKER_IMAGE ||
  docker build --pull=true --build-arg THUNDERBIRD_VERSION=$THUNDERBIRD_VERSION -t $DOCKER_IMAGE .

if [ "$DEVEL_MODE" = "1" ]; then
   DEVEL_MODE_MODIFIERS="-v /tmp/.X11-unix:/tmp/.X11-unix -e DISPLAY -e DEBUG=1 -e LOCAL_DEBUG=1 -v $PWD:/app "
fi

docker run --cap-add=SYS_PTRACE --cpus 2 -ti $DEVEL_MODE_MODIFIERS $DOCKER_IMAGE /bin/bash -l -c "./integration_test.sh"
