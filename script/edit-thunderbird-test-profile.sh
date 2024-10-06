#!/bin/bash

echo "Script that prepares an environment to open the test profile"
echo "and stores it back to tesing fixtures once thunderbird closes."

set -ex

export THUNDERBIRD_VERSION="esr"
IMAGE="automatic_dictionary:${THUNDERBIRD_VERSION}"

docker image inspect $IMAGE ||
  docker build --no-cache --progress=plain --pull=true --build-arg THUNDERBIRD_VERSION=$THUNDERBIRD_VERSION -t $IMAGE .

DEVEL_MODE_MODIFIERS="-v /tmp/.X11-unix:/tmp/.X11-unix -e DISPLAY -e DEBUG=1 -e LOCAL_DEBUG=1 -v $PWD:/app "

PROFILE_FIXTURE="test/integration/fixtures/test-profile.tar.gz"

TMP_DIR=$(mktemp -d)
cp $PROFILE_FIXTURE $TMP_DIR
cd $TMP_DIR
tar -xvzf *.tar.gz
rm -f *.tar.gz

HELPER_MESSAGE="You can run this to change the profile:

thunderbird --profile $TMP_DIR

Later on just close this console and the test profile file will be updated
in your repo.
"

cd -
docker run -it -v $TMP_DIR:$TMP_DIR $DEVEL_MODE_MODIFIERS $IMAGE \
  /bin/bash -l -c "source script/setup_test_env.sh; echo '$HELPER_MESSAGE'; bash -li"

cd $TMP_DIR
sudo chown -R $USER:$USER *
rm -rf cache2/*/* # cache2 might have up to 40MB of cache, we dont need that!
rm -f /tmp/test-profile.tar.gz
tar -cvzf /tmp/test-profile.tar.gz .

cd -

cp -f /tmp/test-profile.tar.gz $PROFILE_FIXTURE