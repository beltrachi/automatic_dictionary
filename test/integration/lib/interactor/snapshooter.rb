require 'interactor/shared'
require 'tempfile'
require 'fileutils'

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

        store_a_copy_for_debugging(file)
        file
      end

      private

      def store_a_copy_for_debugging(img)
        return unless Interactor.debug?
        log_screenshot(img)
      end

      def local_tmp
        File.join(Interactor.root, 'tmp')
      end

      def log_screenshot(img)
        Dir.mkdir(local_tmp) unless Dir.exist?(local_tmp)
        target_path = File.join(local_tmp, File.basename(img))
        FileUtils.cp(img, target_path)
        logger.info("Copied screenshot to #{target_path}")
      end
    end
  end
end