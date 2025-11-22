require 'fileutils'

# This class saves screenshots to an artifact directory for GitHub Actions.
# Screenshots are uploaded as workflow artifacts and can be downloaded
# from the GitHub Actions run page when tests fail.
class ImageUploader
  ARTIFACT_DIR = '/tmp/test-screenshots'

  def upload(filepath)
    FileUtils.mkdir_p(ARTIFACT_DIR)
    timestamp = Time.now.strftime('%Y%m%d-%H%M%S')
    dest = File.join(ARTIFACT_DIR, "screenshot-#{timestamp}.jpg")
    FileUtils.cp(filepath, dest)
    logger.info("Screenshot saved for artifact upload: #{dest}")
  end

  private

  def logger
    @logger ||= Logger.new(STDOUT)
  end
end
