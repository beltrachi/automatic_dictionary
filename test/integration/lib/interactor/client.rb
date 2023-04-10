require 'interactor/snapshooter'
require 'interactor/reader'
require 'interactor/clicker'
require 'interactor/keyboard_hitter'
require 'interactor/window_manager'
require 'forwardable'

module Interactor
  class Client
    class TextNotFound < StandardError; end
    include Interactor::Shared

    attr_accessor :retries, :delay, :hit_delay

    def initialize(options = {})
      self.retries = options.fetch(:retries, 0)
      self.delay = options.fetch(:delay, 1)
      self.hit_delay = options.fetch(:hit_delay, 0.2)
    end

    def text_position(text, options = {})
      Reader.new.text_position(text, options)
    end

    def text_position!(text, options = {})
      text_position(text, options) || raise("Not found #{text}")
    end

    def click_on_text(text, optional: false, filter: nil)
      Clicker.click_on(wait_for_text(text, { filter: filter }))
    rescue StandardError
      raise unless optional

      logger.info("Could not find optional #{text}. Going on...")
    end

    def click_on_position(position)
      Clicker.click_on(position)
    end

    def create_screenshot
      Snapshooter.create_screenshot
    end

    def hit_key(*args)
      sleep hit_delay
      KeyboardHitter.hit_key(*args)
    end

    def current_window_title
      KeyboardHitter.current_window_title.tap do |x|
        logger.info("Current window title is #{x}")
      end
    end

    def wait_for_text(text, options = {})
      logger.info "wait_for_text #{text}"
      local_retries = options[:retries] || retries
      local_delay = options[:delay] || delay
      attempts = 1 + local_retries

      delayed_readers = attempts.times.map do |index|
        DelayedReader.new(local_delay * index)
      end

      position = text_position_from_delayed_readers(delayed_readers, text, options)

      return position if position

      raise TextNotFound, "Text '#{text}' not found"
    ensure
      delayed_readers.map(&:stop)
    end

    def input_text(text)
      sleep delay
      KeyboardHitter.input_text(text)
    end

    def current_window_geometry
      WindowManager.current_window_geometry
    end

    private

    def text_position_from_delayed_readers(delayed_readers, text, options)
      delayed_readers.each_with_index do |delayed_reader, index|
        2.times do
          position = delayed_reader.text_position(text, options)
          if position
            logger.info "Position found for #{text} at attempt number #{index + 1}"
            return position
          end
          # Increase zoom
          delayed_reader.resize_ratio *= 2
        end
      end

      nil
    end

    class DelayedReader
      extend Forwardable
      def_delegators :@reader, :resize_ratio, :resize_ratio=

      def initialize(delay)
        @reader = Reader.new
        @stopped = false

        @thread = Thread.new do
          sleep delay
          @reader.capture_screen unless @stopped
        end
      end

      def text_position(*args)
        raise 'Asking for text_position to a stopped reader' if @stopped

        @thread.join
        @reader.text_position(*args)
      end

      def stop
        @stopped = true
      end
    end
  end
end
