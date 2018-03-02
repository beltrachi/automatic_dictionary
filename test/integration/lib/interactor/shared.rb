require 'benchmark'

module Interactor
  module Shared
    def run(command)
      logger.info("Executing command #{command}")
      out = nil
      delta = Benchmark.realtime do
        out = `#{command}`
      end
      logger.debug("Command executed in #{delta}")
      out
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