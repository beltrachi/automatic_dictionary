# Container to run functional tests of the extension.
FROM ubuntu:16.04

# Configurable container argument
ARG THUNDERBIRD_VERSION=stable

# Configure locale as utf to avoid encoding issues
RUN apt-get update
RUN apt-get install -y sudo
ENV LANG C.UTF-8
ENV LC_ALL C.UTF-8

ENV APP_HOME /app
RUN mkdir $APP_HOME
WORKDIR $APP_HOME

ADD ./script/install_* $APP_HOME/script/
ADD ./test/integration/Gemfile* ./test/integration/.ruby-version $APP_HOME/test/integration/
RUN $APP_HOME/script/install_dependencies.sh
RUN $APP_HOME/script/install_thunderbird.sh

ADD . $APP_HOME
