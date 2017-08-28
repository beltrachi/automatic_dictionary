require 'interactor/snapshooter'
require 'interactor/reader'
require 'interactor/clicker'
require 'interactor/keyboard_hitter'

module Interactor
  class Client
    class TextNotFound < StandardError; end

    attr_accessor :retries, :delay

    def initialize(options = {})
      self.retries = options.fetch(:retries, 5)
      self.delay = options.fetch(:delay, 1)
    end

    def text_position(text)
      # TODO: make this method multi-attempt to not
      # capture screen 4 times (Because screen can change)
      Reader.text_position(text)
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
      sleep 0.5
      KeyboardHitter.hit_key(*args)
    end

    def wait_for_text(text, screen_file: nil)
      puts ">>> wait for text #{text}"
      sleep 0.5
      retries.times do |attempt|
        position = Reader.text_position(text, attempt)
        return position if position
        sleep delay
      end
      fail TextNotFound.new("Text '#{text}' not found")
    end

    def input_text(text)
      sleep delay
      KeyboardHitter.input_text(text)
    end
  end
end