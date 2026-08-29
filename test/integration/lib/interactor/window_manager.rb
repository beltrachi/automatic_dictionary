require 'interactor/shared'
require 'shellwords'

module Interactor
  module WindowManager
    class << self
      include Shared

      def current_window_geometry
        active_window_id = run('xdotool getactivewindow').split("\n").last
        geo = run("xdotool getwindowgeometry #{active_window_id}")
        position = geo.match(/Position: (?<x>\d+),(?<y>\d+) /).named_captures
        size = geo.match(/Geometry: (?<width>\d+)x(?<height>\d+)/).named_captures

        WindowGeometry.new(position['x'].to_i, position['y'].to_i, size['width'].to_i, size['height'].to_i)
      end

      # Activate (raise and focus) the first window whose title matches the
      # given regexp pattern. Returns true if a matching window was found and
      # activated, false otherwise.
      def activate_window_matching(pattern)
        window_id = run("xdotool search --name #{Shellwords.escape(pattern)}").split("\n").first
        return false if window_id.nil? || window_id.empty?

        run("xdotool windowactivate #{window_id}")
        true
      end
    end

    class WindowGeometry
      attr_reader :width, :height, :position

      def initialize(position_x, position_y, width, height)
        @position = { x: position_x, y: position_y }
        @width = width
        @height = height
      end

      def include?(point_x, point_y)
        return false if point_x < position[:x] || point_y < position[:y]
        return false if point_x > position[:x] + width
        return false if point_y > position[:y] + height

        true
      end
    end
  end
end
