require 'interactor/shared'

module Interactor
  module Clicker
    class << self
      include Shared

      def click_on(position)
        run("xdotool mousemove --sync #{position.first} #{position.last}")
        sleep 1
        run('xdotool mousedown --clearmodifiers 1')
        sleep 0.1
        run('xdotool mouseup 1')
        sleep 1
      end
    end
  end
end
