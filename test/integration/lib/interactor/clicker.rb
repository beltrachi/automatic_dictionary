require 'interactor/shared'

module Interactor
  module Clicker
    class << self
      include Shared

      def click_on(position)
        run("xdotool mousemove --sync #{position.first} #{position.last}")
        sleep 1
        run('xdotool click --clearmodifiers 1')
        sleep 2
      end
    end
  end
end
