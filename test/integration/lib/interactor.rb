require 'interactor/snapshooter'
require 'interactor/reader'
require 'interactor/clicker'
require 'interactor/keyboard_hitter'

module Interactor
  # Include this class where you want the helper methods

  def text_position(text)
    Reader.text_position(text)
  end

  def click_on_text(text)
    Clicker.click_on(Reader.text_position(text))
  end

  def create_screenshot
    Snapshooter.create_screenshot
  end

  def hit_key(key)
    KeyboardHitter.hit_key(key)
  end
end