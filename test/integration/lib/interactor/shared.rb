require 'benchmark'

module Interactor
  module Shared
    def run(command)
      puts "#{Time.now} - #{command}"
      out = nil
      delta = Benchmark.realtime do
        out = `#{command}`
      end
      puts "### Command executed in #{delta}" if delta > 1.0
      out
    end

    def logger
      @logger ||= Logger.new(STDOUT)
    end

    def log_dir
      @log_dir ||= File.join(Interactor.root, 'log')
      Dir.mkdir(@log_dir) unless Dir.exist?(@log_dir)
      @log_dir
    end
  end
end