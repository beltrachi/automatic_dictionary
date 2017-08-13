module Interactor
  module Shared
    def run(command)
      `#{command}`
    end
  end
end