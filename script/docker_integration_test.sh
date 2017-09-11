#!/bin/bash

docker build -t automatic_dictionary .
docker run automatic_dictionary /bin/bash -c "./integration_test.sh"