require 'interactor/snapshooter'
require 'interactor/reader'
require 'interactor/clicker'
require 'interactor/keyboard_hitter'

module Interactor
  class Client
    class TextNotFound < StandardError; end

    attr_accessor :retries, :delay, :hit_delay

    def initialize(options = {})
      self.retries = options.fetch(:retries, 5)
      self.delay = options.fetch(:delay, 1)
      self.hit_delay = options.fetch(:hit_delay, 0.2)
    end

    def text_position(text)
      # TODO: make this method multi-attempt to not
      # capture screen 4 times (Because screen can change)
      Reader.new.text_position(text)
    end

    def text_position!(text)
      text_position(text) || raise("Not found #{text}")
    end

    def click_on_text(text)
      Clicker.click_on(wait_for_text(text))
    end

    def create_screenshot
      Snapshooter.create_screenshot
    end

    def hit_key(*args)
      sleep hit_delay
      KeyboardHitter.hit_key(*args)
    end

    def wait_for_text(text, screen_file: nil)
      puts ">>> wait for text #{text}"
      retries.times do |attempt|
        sleep_if_faster_than(delay) do
          ratio = 4 + attempt * 2
          position = Reader.new(resize_ratio: ratio).text_position(text)
          return position if position
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
        puts "Sleeping #{delta}"
        sleep(delta)
      end
      out
    end
  end
end