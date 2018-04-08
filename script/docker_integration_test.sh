#!/bin/bash

docker build --build-arg THUNDERBIRD_VERSION=$THUNDERBIRD_VERSION -t automatic_dictionary .
docker run automatic_dictionary /bin/bash -l -c "./integration_test.sh"