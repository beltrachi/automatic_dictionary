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
  end
end