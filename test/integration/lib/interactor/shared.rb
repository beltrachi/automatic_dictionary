module Interactor
  module Shared
    def run(command)
      puts command
      `#{command}`
    end
  end
end