require 'interactor'
require 'net/http/post/multipart'
require 'json'

class FileUploader
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

class T
  class << self
    def root
      File.expand_path(File.join(File.dirname(__FILE__), '..', '..'))
    end

    def local_tmp
      File.join(root, 'tmp')
    end

    def log_screenshot(img = nil)
      `mkdir -p #{local_tmp}`
      img ||= Interactor.client.create_screenshot
      `cp  #{img} #{File.join(local_tmp, File.basename(img))} `
    end
  end
end
`rm -rf #{T.local_tmp}/*`

describe "AutomaticDictionary integration tests" do
  # Counting on:
  # - the DISPLAY is where the app is running
  # - It has the focus
  # - The application language is english.

  # Target:
  # - Test that it gets installed correctly
  # - We can compose.
  # - It remembers languages.
  # - Preferences window works correctly.

  let(:profile_path) { Dir.mktmpdir }

  def run(command)
#    command = "cd #{root} ; #{command}"
    puts command
    system(command)
  end

  def prepare_profile(path)
    source = File.join(root, 'test/integration/fixtures/test-profile.tar.gz')
    run("tar -xvf #{source} -C #{path}")
  end

  def install_extension(extension_file, profile_path)
    cmd = File.join(root, 'script/install_extension.sh')
    extension = File.join(root, extension_file)
    install = "#{cmd} --path #{profile_path} --extension #{extension}"
    run(install)
  end

  let(:root) do
    File.expand_path(File.join(File.dirname(__FILE__), '..', '..', '..', '..'))
  end

  let(:local_tmp) { File.join(root, 'tmp') }

  let(:interactor) { Interactor.client }
  let(:spanish_dictionary_url) do
    "https://addons.mozilla.org/thunderbird/downloads/latest/spanish-spain-"\
    "dictionary/addon-3554-latest.xpi?src=dp-btn-primary"
  end
  let(:spanish_dictionary_file) { 'spanish-dictionary.xpi' }
  let(:spanish_dictionary_path) { File.join(root, spanish_dictionary_file) }

  before(:suite) do
    # Update build to lastest
    run(File.join(root, "build.sh"))
    run("ls #{File.join(root, spanish_dictionary_file)} || "\
        " curl -L #{spanish_dictionary_url} -o #{spanish_dictionary_file}")
  end

  before do
    prepare_profile(profile_path)
    install_extension('automatic_dictionary.xpi', profile_path)
    install_extension('spanish-dictionary.xpi', profile_path)
    run("thunderbird --profile #{profile_path} --no-remote &")
  end

  after do
    run("pkill thunderbird")
  end

  it 'works :_D' do
    begin
      # Configure a fake test account
      sleep 5

      5.times do
        interactor.hit_key('Escape')
      end
      # Focus on the new account
      interactor.click_on_text('test@mail.com')

      sleep 1

      # Enalbe plugins
      interactor.hit_key('Alt+t a', clear_modifiers: false)
      sleep 2

      # Enable extension
      interactor.click_on_text('Extensions')
      sleep 1
      if interactor.text_position('Enable')
        interactor.click_on_text('Enable')
      end
      # Enable spanish
      interactor.click_on_text('Dictionaries')

      if interactor.text_position('Enable')
        interactor.click_on_text('Enable')
      end

      interactor.hit_key('Control+w')

      # Open composer
      interactor.hit_key('Control+n')
      sleep 1
      interactor.input_text('en@en.en')
      interactor.hit_key('Tab')
      interactor.input_text('Some subject')
      interactor.hit_key('Tab')
      interactor.input_text('This is the body')
      sleep 1

      # Accept to collect data
      interactor.click_on_text("Don't do it")

      # TODO: have a fake smtp/pop server to send
      # emails.
      interactor.hit_key('Control+n')
      sleep 1
      interactor.input_text('es@es.es')
      interactor.hit_key('Tab')
      interactor.input_text('Un asunto')
      interactor.hit_key('Tab')
      sleep 1
      interactor.hit_key('Ctrl+Shift+P')
      interactor.hit_key('Alt+l')
      interactor.hit_key('s p a')
      sleep 1
      interactor.hit_key('Return')
      interactor.hit_key('Alt+c')

      interactor.text_position!('Saved es-ES as default')
      # Close the window
      interactor.hit_key('Ctrl+w')
      interactor.hit_key('Alt+n')

      # Close other window
      interactor.hit_key('Ctrl+w')
      interactor.hit_key('Alt+n')

      # Save en-US for en@en.en
      interactor.hit_key('Control+n')
      sleep 1
      interactor.input_text('en@en.en')
      interactor.hit_key('Tab')
      interactor.input_text('A subject')
      interactor.hit_key('Tab')
      sleep 1
      interactor.hit_key('Ctrl+Shift+P')
      interactor.hit_key('Alt+l')
      interactor.hit_key('e n g')
      sleep 1
      interactor.hit_key('Return')
      interactor.hit_key('Alt+c')

      interactor.text_position!('Saved en-US as default')

      # Close other window
      interactor.hit_key('Ctrl+w')
      interactor.hit_key('Alt+n')

      # Restore es-ES
      interactor.hit_key('Control+n')
      sleep 1
      interactor.input_text('es@es.es')
      interactor.hit_key('Tab')
      interactor.hit_key('Tab')
      sleep 1
      interactor.text_position!('Remembered es-ES')
    rescue => e
      filepath = interactor.create_screenshot
      FileUploader.new.upload(filepath)
      require 'byebug';byebug;2+2

      puts e.inspect
      puts e.backtrace.join("\n")
      puts Interactor::Reader.words
      raise e
    end
  end
end
