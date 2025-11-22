#!/bin/bash

set -ex

# Recreate daily to get latest thunderbird app
DOCKER_IMAGE="automatic_dictionary:${THUNDERBIRD_VERSION}-$(date -I)"

docker image inspect $DOCKER_IMAGE ||
  docker build --progress=plain --pull=true --build-arg THUNDERBIRD_VERSION=$THUNDERBIRD_VERSION -t $DOCKER_IMAGE .

if [ "$DEVEL_MODE" = "1" ]; then
   DEVEL_MODE_MODIFIERS="-it -v /tmp/.X11-unix:/tmp/.X11-unix -e DISPLAY -e DEBUG=1 -e LOCAL_DEBUG=1 -v $PWD:/app "
fi

# Create screenshots directory for artifacts
mkdir -p /tmp/test-screenshots

# Run docker and capture exit code (disable set -e temporarily)
set +e
docker run --cap-add=SYS_PTRACE --cpus 2 \
  -v /tmp/test-screenshots:/tmp/test-screenshots \
  $DEVEL_MODE_MODIFIERS $DOCKER_IMAGE /bin/bash -l -c "./integration_test.sh; EXIT_CODE=\$?; chmod -R 777 /tmp/test-screenshots 2>/dev/null || true; exit \$EXIT_CODE"
EXIT_CODE=$?
set -e

exit $EXIT_CODE
