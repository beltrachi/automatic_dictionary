require 'interactor/snapshooter'
require 'interactor/reader'
require 'interactor/clicker'
require 'interactor/keyboard_hitter'

module Interactor
  class Client
    class TextNotFound < StandardError; end
    include Interactor::Shared

    attr_accessor :retries, :delay, :hit_delay

    def initialize(options = {})
      self.retries = options.fetch(:retries, 2)
      self.delay = options.fetch(:delay, 1)
      self.hit_delay = options.fetch(:hit_delay, 0.2)
    end

    def text_position(text)
      Reader.new.text_position(text)
    end

    def text_position!(text)
      text_position(text) || raise("Not found #{text}")
    end

    def click_on_text(text)
      Clicker.click_on(wait_for_text(text))
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

    def wait_for_text(text)
      logger.info "wait_for_text #{text}"
      reader = Reader.new
      (1 + retries).times do |attempt|
        sleep_if_faster_than(delay) do
          # As reader can take up to 40s, to read a screen, we can't
          # capture the screen shot on each retry because that can be
          # too late. Best way would be to reuse the same reader while
          # increasing size. (Reader memoizes the screenshot)
          # FIXME: BUT THEN IT'S NOT WAIT FOR TEXT ANY MORE!
          reader.resize_ratio = 2 + attempt * 2
          position = reader.text_position(text)
          if position
            logger.info "Position found for #{text} at attempt number #{attempt}"
            return position
          end
        end
      end
      fail TextNotFound.new("Text '#{text}' not found")
    end

    def input_text(text)
      sleep delay
      KeyboardHitter.input_text(text)
    end

    private

    def sleep_if_faster_than(desired_delta)
      start = Time.now.to_f

      out = yield

      delta = desired_delta - (Time.now.to_f - start)
      if delta > 0
        logger.debug("Sleeping #{delta} because faster than #{desired_delta}")
        sleep(delta)
      end
      out
    end
  end
end