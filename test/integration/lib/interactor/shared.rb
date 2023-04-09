require 'benchmark'

module Interactor
  module Shared
    class CommandExecutionError < StandardError
      attr_reader :command, :status_code

      def initialize(command, status_code)
        @command = command
        @status_code = status_code
      end
    end

    def run(command)
      logger.info("Executing command #{command}")
      out = nil
      status = nil
      delta = Benchmark.realtime do
        out = `#{command}`
        status = $?
      end
      logger.debug("Command executed in #{delta}")

      raise CommandExecutionError.new(command, status), "Command failed with status #{status}" unless status.success?

      out
    end

    def rescue_and_retry_on(exception = StandardError, attempts: 2, delay: 0)
      attempts.times do |attempt|
        return yield
      rescue exception
        raise if attempt == attempts - 1

        sleep delay
      end
    end

    def logger
      Interactor.logger
    end

    def log_dir
      @log_dir ||= File.join(Interactor.root, 'log')
      Dir.mkdir(@log_dir) unless Dir.exist?(@log_dir)
      @log_dir
    end
  end
end