require 'interactor/shared'

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
    end

    class WindowGeometry
      attr_reader :width, :height, :position

      def initialize(position_x, position_y, width, height)
        @position = {x: position_x, y: position_y}
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
