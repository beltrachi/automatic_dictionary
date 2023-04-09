require 'interactor/shared'

module Interactor
  module KeyboardHitter
    class << self
      include Shared

      def hit_key(key, options = {})
        options = {
          clear_modifiers: true
        }.merge(options)
        clear = '--clearmodifiers' if options[:clear_modifiers]
        # Delay time is in miliseconds
        delay = "--delay #{options[:delay] * 1000}" if options[:delay]
        run("xdotool key #{clear} #{delay} #{key}")
      end

      def input_text(text)
        escaped_text = text.gsub("'",'\\')
        run("xdotool type -clearmodifiers '#{escaped_text}'")
      end

      def current_window_title
        rescue_and_retry_on(CommandExecutionError) do
          run("xdotool getwindowname #{current_window_id}")
        end
      end

      protected

      def current_window_id
        run('xdotool getactivewindow')
      end
    end
  end
end
