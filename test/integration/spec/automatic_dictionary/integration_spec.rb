require 'interactor'
require 'image_uploader'

describe "AutomaticDictionary integration tests" do
  # Counting on:
  # - the DISPLAY env var is a valid X server
  # - The application language is english.

  # Target:
  # - Test that it gets installed correctly.
  # - We can compose.
  # - It remembers languages.
  # - It deduces langauge based on domain.
  # - Preferences window shows correctly.

  let(:profile_path) { Dir.mktmpdir }
  let(:logger) do
    puts "DEBUG IS #{ENV['DEBUG']}"
    Logger.new(STDOUT).tap do |logger|
      logger.level = Logger::ERROR unless ENV['DEBUG']
    end
  end

  def run(command)
    logger.debug(command)
    system(command) || raise("Command failed: #{command}")
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

  around do |example|
    begin
      example.run
    rescue => e
      # Report any error and current screenshot
      log_and_fail(e)
      raise e
    end
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
  let(:log_file) { "#{profile_path}/automatic_dictionary.log" }
  before do
    # Update build to lastest
    run("cd #{root} ; ./build.sh")
    run("ls #{spanish_dictionary_path} || "\
        " curl -L #{spanish_dictionary_url} -o #{spanish_dictionary_path}")

    prepare_profile(profile_path)
    install_extension('automatic_dictionary.xpi', profile_path)
    install_extension(spanish_dictionary_file, profile_path)

    # Change interface font to be easier to read for tesseract
    run("mkdir #{profile_path}/chrome")
    File.open("#{profile_path}/chrome/userChrome.css", "w") do |css|
      css.write '
* {
  font-family: monospace !important;
}'
    end
    # Tune extensions tabs too.
    File.open("#{profile_path}/chrome/userContent.css", "w") do |css|
      css.write '
* {
  font-family: monospace !important;
}'
    end
    run("touch #{log_file}")
    run("tail -f #{log_file} &")
    run("thunderbird --profile #{profile_path} --no-remote &")

    sleep 5

    # Escape any wizard on start
    5.times do
      sleep 1
      interactor.hit_key('Escape')
    end

    begin
      # Enable plugins on Thunderbird 60 and below
      2.times do
        interactor.click_on_text('Install Add-on')
        interactor.click_on_text('Allow this installation')
        interactor.click_on_text('Continue')
      end
    rescue => e
      logger.error("Failed to enable plugins: #{e}. Maybe TB < 60?")
    end

    # Focus on the account
    begin
      interactor.click_on_text('test@mail.com')
    rescue
      logger.error("Can't click on test@mail.com, let's see if we can go on")
    end

    sleep 1
  end

  after do |example|
    if example.exception != nil
      if ENV['LOCAL_DEBUG'] == "1"
        require 'byebug'
        byebug
      else
        log_and_fail(example.exception)
      end
    end
    run("pkill thunderbird")
    run("pkill tail")
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

    # for TB 60
    if interactor.current_window_title.include? "Save Message"
      # Window did not close, lets try the "Discard" shortcut
      interactor.hit_key('Alt+d')
    end
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
    sleep 1
    interactor.wait_for_text(text)
  end

  def log_and_fail(error)
    filepath = interactor.create_screenshot
    ImageUploader.new.upload(filepath) rescue nil # Not upload when offline
    logger.error(error.inspect)
    logger.error(error.backtrace.join("\n"))
    raise error
  end

  it 'works :_D' do
    on_composer(to: 'en@en.en', subject: 'Some subject', body: 'Hi')  do
      # Accept to collect data
      interactor.click_on_text("Don't do it")

      # Open a window without closing the other
      on_composer(to: 'es@es.es', subject:'Un asunto') do
        change_spellchecker_language('spa')
        wait_for_label('Saved es-ES as default')
      end
    end

    on_composer(to: 'es2@es.es', subject: 'Otro asunto') do
      wait_for_label('Guessed es-ES')
    end

    # Remember es-ES
    on_composer(to:'es@es.es') do
      wait_for_label('Remembered es-ES')
    end

    # Test when recipients are too much
    recipients = 11.times.map { |i| "fr#{i}@fr.fr" }.join(',')
    on_composer(to: recipients) do
      change_spellchecker_language('spa')
      wait_for_label('Discarded to save language preferences as there are too much recipients.')
    end
  end

  it 'preferences window' do
    interactor.hit_key('Alt+t a', delay: 0.15)
    sleep 2

    interactor.click_on_text('Extensions')
    sleep 1
    interactor.click_on_text('Preferences')
    sleep 5
    interactor.wait_for_text('Allow to collect statistical data:')
  end
end
