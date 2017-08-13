require 'interactor/shared'
require 'tempfile'

module Interactor
  module Snapshooter
    class << self
      include Shared

      def create_screenshot
        file=Tempfile.new('screenshot').path
        file="#{file}.jpg"

        # Note: we are using jpg because imagemagick png can last as much as 12s
        # when converting images. Jpg is 1s. Increased quality be less lossy.
        run("import -window root -quality 99% #{file}")
        file
      end
    end
  end
end