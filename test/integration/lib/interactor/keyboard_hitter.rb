require 'interactor/shared'

module Interactor
  module KeyboardHitter
    class << self
      include Shared

      def hit_key(key)
        run("xdotool key -c #{key}")
      end
    end
  end
end
