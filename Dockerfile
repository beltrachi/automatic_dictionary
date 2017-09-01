FROM ubuntu:16.04

# Container to run functional tests of the extension.

# Configure locale as utf to avoid encoding issues
RUN apt-get update
RUN apt-get install -y sudo

ENV LANG C.UTF-8
ENV LC_ALL C.UTF-8

ENV APP_HOME /app
RUN mkdir $APP_HOME
WORKDIR $APP_HOME

ADD . $APP_HOME

RUN $APP_HOME/script/install_dependencies.sh
