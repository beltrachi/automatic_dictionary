require 'interactor/snapshooter'
require 'interactor/reader'
require 'interactor/clicker'
require 'interactor/keyboard_hitter'

module Interactor
  class Client
    attr_accessor :retries, :delay

    def initialize(options = {})
      self.retries = options.fetch(:retries, 5)
      self.delay = options.fetch(:delay, 1)
    end

    def text_position(text)
      Reader.text_position(text)
    end

    def click_on_text(text)
      Clicker.click_on(wait_for_text(text))
    end

    def create_screenshot
      Snapshooter.create_screenshot
    end

    def hit_key(key)
      KeyboardHitter.hit_key(key)
    end

    def wait_for_text(text)
      retries.times do
        position = Reader.text_position(text)
        return position if position
        sleep delay
      end
    end
  end
end