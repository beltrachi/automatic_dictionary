require 'net/http/post/multipart'

# This class uploads the image to uploads.im, a service
# where you can upload pictures of 10MB max.
# The url is shown in stdout.
# This is useful when running tests on CI and you want to
# see what was on the screen then.
class ImageUploader
  def upload(filepath)
    url = URI.parse('https://file.io/?expires=1w')
    json = `curl -F "file=@#{filepath}" #{url}`
    logger.info(
      'Uploaded screenshot: ' +
      JSON.parse(json)['link']
    )
  end

  private

  def logger
    @logger ||= Logger.new(STDOUT)
  end
end

