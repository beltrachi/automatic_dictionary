require 'interactor/shared'
require 'tempfile'

module Interactor
  module Clicker
    class << self
      include Shared

      def click_on(position)
        run("xdotool mousemove #{position.first} #{position.last}")
        run("xdotool click -c 1")
      end
    end
  end
end
