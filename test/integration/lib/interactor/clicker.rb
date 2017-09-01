require 'interactor/shared'

module Interactor
  module Clicker
    class << self
      include Shared

      def click_on(position)
        run("xdotool mousemove --sync #{position.first} #{position.last}")
        sleep 1
        run('xdotool click 1')
        sleep 2
      end

      private

      def window_id
        window = run('xdotool getmouselocation --shell | grep WINDOW').strip
        window.split('=').last
      end
    end
  end
end
