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

  before do
    # Update build to lastest
    run("cd #{root} ; build.sh")
    run("ls #{spanish_dictionary_path} || "\
        " curl -L #{spanish_dictionary_url} -o #{spanish_dictionary_path}")
  end

  before do
    prepare_profile(profile_path)
    install_extension('automatic_dictionary.xpi', profile_path)
    install_extension(spanish_dictionary_file, profile_path)
    run("thunderbird --profile #{profile_path} --no-remote &")

    sleep 5

    # Escape any wizard on start
    5.times do
      interactor.hit_key('Escape')
    end
    # Focus on the account
    interactor.click_on_text('test@mail.com')

    sleep 1

    enable_plugins
  end

  after do
    run("pkill thunderbird")
  end

  def enable_plugins
    # Enable plugins
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
  end

  def on_composer(to: nil, subject: nil, body: nil)
    interactor.hit_key('Control+n')
    sleep 1
    interactor.input_text(to) if to
    interactor.hit_key('Tab')
    interactor.input_text(subject) if subject
    interactor.hit_key('Tab')
    interactor.input_text(body) if body

    yield

    # Close window without saving draft
    interactor.hit_key('Ctrl+w')
    interactor.hit_key('Alt+n')
  end

  def change_spellchecker_language(dict_name)
    interactor.hit_key('Ctrl+Shift+P')
    interactor.hit_key('Alt+l')
    # Send chars separated by spaces to simulate keystokes
    interactor.hit_key(dict_name.chars.join(' '))
    sleep 0.5
    interactor.hit_key('Return')
    interactor.hit_key('Alt+c')
  end

  def wait_for_label(text)
    # Label lasts a little to appear. Let's wait a little bit.
    sleep 2
    interactor.wait_for_text(text)
  end

  def log_and_fail(error)
    filepath = interactor.create_screenshot
    FileUploader.new.upload(filepath) rescue nil # Not upload when offline
    puts error.inspect
    puts error.backtrace.join("\n")
    raise error
  end

  it 'works :_D' do
    begin
      on_composer(to: 'en@en.en', subject: 'Some subject', body: 'Hi')  do
        # Accept to collect data
        interactor.click_on_text("Don't do it")

        # Open a window without closing the other
        on_composer(to: 'es@es.es', subject:'Un asunto') do
          change_spellchecker_language('spa')
          wait_for_label('Saved es-ES as default')
        end
      end
      # TODO: have a fake smtp/pop server to send
      # emails.

      # Save en-US for en@en.en
      on_composer(to: 'en@en.en', subject: 'A subject') do
        change_spellchecker_language('eng')
        wait_for_label('Saved en-US as default')
      end

      # Remember es-ES
      on_composer(to:'es@es.es') do
        wait_for_label('Remembered es-ES')
      end
    rescue => e
      log_and_fail(e)
    end
  end

  it 'preferences window' do
    begin
      interactor.hit_key('Alt+t a', clear_modifiers: false)
      sleep 2

      # Enable extension
      interactor.click_on_text('Extensions')
      sleep 1
      interactor.click_on_text('Preferences')

      interactor.text_position!('Allow to collect statistical data:')
    rescue => e
      log_and_fail(e)
    end
  end
end
