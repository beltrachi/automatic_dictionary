FROM ubuntu:14.04

# Container to run functional tests of the extension.

RUN sudo apt-get update
RUN sudo apt-get install -y xvfb thunderbird

ENV APP_HOME /app
RUN mkdir $APP_HOME
WORKDIR $APP_HOME

ADD . $APP_HOME

