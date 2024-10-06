#!/bin/bash

set -ex

xhost +local:root

export DEVEL_MODE=1

THUNDERBIRD_VERSION=esr ./script/docker_integration_test.sh

THUNDERBIRD_VERSION=latest ./script/docker_integration_test.sh

THUNDERBIRD_VERSION="beta-latest" ./script/docker_integration_test.sh
