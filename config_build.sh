#!/bin/bash

# Build config for the build script, build.sh. Look there for more info.

APP_NAME=automatic_dictionary          # short-name, jar and xpi files name. Must be lowercase with no spaces
CHROME_PROVIDERS="chrome/content"  # which chrome providers we have (space-separated list)
CLEAN_UP=1          # delete the jar / "files" when done?       (1/0)
ROOT_FILES="README"        # put these files in root of xpi (space separated list of leaf filenames)
ROOT_DIRS="defaults"         # ...and these directories       (space separated list)
BEFORE_BUILD=      # run this before building       (bash command)
AFTER_BUILD=       # ...and this after the build    (bash command)

