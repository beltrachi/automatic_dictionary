require 'net/http/post/multipart'

# This class uploads the image to uploads.im, a service
# where you can upload pictures of 10MB max.
# The url is shown in stdout.
# This is useful when running tests on CI and you want to
# see what was on the screen then.
class ImageUploader
  def upload(filepath)
    url = URI.parse('http://uploads.im/api')
    File.open(filepath) do |jpg|
      req = Net::HTTP::Post::Multipart.new(
        url.path,
        "upload" => UploadIO.new(jpg, "image/jpeg", "image.jpg")
      )
      res = Net::HTTP.start(url.host, url.port) do |http|
        http.request(req)
      end
      puts 'Uploaded screenshot: ' +
           JSON.parse(res.body)['data']['img_url'].gsub('\/', '/')
      res
    end
  end
end

