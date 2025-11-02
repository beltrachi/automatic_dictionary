# Container to run functional tests of the extension.
FROM ruby:3.4.7 AS base

# Configure locale as utf to avoid encoding issues
RUN apt-get update && apt-get install -y sudo
ENV LANG=C.UTF-8
ENV LC_ALL=C.UTF-8

ENV APP_HOME=/app
RUN mkdir $APP_HOME
WORKDIR $APP_HOME

ADD ./script/install_dependencies.sh $APP_HOME/script/
ADD ./test/integration/Gemfile* ./test/integration/.ruby-version $APP_HOME/test/integration/
RUN $APP_HOME/script/install_dependencies.sh

FROM base
# Configurable container argument
ARG THUNDERBIRD_VERSION=stable

ADD ./script/install_thunderbird.sh $APP_HOME/script/
RUN $APP_HOME/script/install_thunderbird.sh

ADD . $APP_HOME
