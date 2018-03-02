require 'interactor/client'

module Interactor
  class << self
    attr_reader :logger

    def client(opts = {})
      Interactor::Client.new(opts)
    end

    def root
      File.expand_path(File.join(File.dirname(__FILE__), '..', '..'))
    end

    def debug?
      ENV['DEBUG'] == "1"
    end

    def logger
      @logger ||= Logger.new(STDOUT).tap do |logger|
        logger.level = Logger::INFO unless ENV['DEBUG']
      end
    end
  end
end