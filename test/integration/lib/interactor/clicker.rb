require 'interactor/shared'

module Interactor
  module Clicker
    class << self
      include Shared

      def click_on(position)
        # Even if we use --sync, when using mousemove does not guarantee that
        # cursor is in its destination. Sync only waits until it moves, not
        # until it reaches destination.
        # For that reason we first move the cursor with sync (to make sure it
        # has at least moved). Then we sleep 1 sec to let cursor arrive, and then
        # click there.
        run("xdotool mousemove --sync #{position.first} #{position.last}")
        sleep 1
        run('xdotool click --clearmodifiers 1')
        sleep 0.5
      end
    end
  end
end
