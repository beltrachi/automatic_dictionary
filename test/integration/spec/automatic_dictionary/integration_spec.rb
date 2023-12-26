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

  INSTALLED_DICTIONARIES = %w[Spanish English].freeze

  let(:profile_path) { Dir.mktmpdir }
  let(:logger) do
    Logger.new(STDOUT).tap do |logger|
      logger.level = Logger::ERROR unless ENV['DEBUG']
    end
  end

  # @return false when command failed
  def run(command)
    logger.debug(command)
    system(command)
  end

  def run!(command)
    run(command) || raise("Command failed: #{command}")
  end

  def capture_command(command)
    logger.debug(command)
    `#{command}`.tap { |output| logger.debug(output) }
  end

  let(:profile_base) do
    'test/integration/fixtures/test-profile.tar.gz'
  end

  def prepare_profile(path)
    source = File.join(root, profile_base)
    run!("tar -xvf #{source} -C #{path}")
  end

  def in_main_window?
    title = interactor.current_window_title
    title.start_with?('Inbox') || title.start_with?('Home')
  end

  def window_title_include?(text)
    interactor.current_window_title.include?(text)
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
  let(:thunderbird_version) do
    version = `thunderbird --version`.chomp
    logger.info("Thunderbird version: #{version}")
    Gem::Version.new(version.match(/\d+\.\d+/)[0])
  end

  def thunderbird_cpu
    capture_command('ps auxf')
    pid = capture_command('pgrep thunderbird').strip
    capture_command("ps -p #{pid} -o %cpu=").strip.to_f
  end

  def start_thunderbird
    10.times do
      launch_thunderbird
      sleep(5)
      return if thunderbird_cpu < 90.0

      handle_high_cpu_usage
    end

    raise "Thunderbird high CPU usage could not be worked around :skull:"
  end

  def launch_thunderbird
    run!("thunderbird --profile #{profile_path} --no-remote &")
  end

  def handle_high_cpu_usage
    logger.warn("Thunderbird CPU was too high (#{thunderbird_cpu})")

    stop_thunderbird
  end

  before do
    # Update build to lastest
    run!("cd #{root} ; ./build.sh")

    prepare_profile(profile_path)

    log_thunderbird_version

    start_thunderbird

    if thunderbird_version > Gem::Version.new('114')
      # Skipping 'Thunderbird updating window'
      interactor.wait_for_text('New Message', retries: 5, delay: 10)
    end

    # Close random thunderbird popups
    interactor.click_on_text('Could not connect to', optional: true)
    interactor.hit_key('Escape')
    sleep 1
    interactor.hit_key('Escape')

    install_extension

    sleep 1
  end

  def log_thunderbird_version
    thunderbird_version
  end

  def install_extension
    # Open addons tab
    interactor.hit_key('Alt+t a', clear_modifiers: false)
    sleep 1
    5.times { interactor.hit_key('Tab') } # Navigate to the options icon
    interactor.hit_key('Return')
    interactor.hit_key('i') # Install from file
    sleep 0.5
    interactor.hit_key('Ctrl+l')
    interactor.input_text(File.join(root,'automatic_dictionary.xpi'))
    interactor.hit_key('Return')
    sleep 1
    # Make sure the pseudo-popup has the focus
    interactor.wait_for_text('Automatic Dictionary?', retries: 10, delay: 5)
    interactor.click_on_text('Automatic Dictionary?')
    interactor.hit_key('Alt+a') # Hit Add button
    sleep 1
    interactor.hit_key('Alt+o') # Hit OK button
    sleep 1
    interactor.hit_key('Ctrl+w') # Close addons tab
    sleep 1
  end

  after do |example|
    if example.exception != nil
      if ENV['LOCAL_DEBUG'] == "1"
        puts example.exception
        require 'byebug'
        byebug
      else
        log_and_fail(example.exception)
      end
    end
    stop_thunderbird
  end

  def stop_thunderbird
    while run("pgrep thunderbird") do
      logger.info("Stopping thunderbird...")
      run("sleep 1 && pkill thunderbird")
    end
  end

  def on_composer(to: nil, subject: nil, body: nil)
    interactor.hit_key('Control+n')
    sleep 2
    unless window_title_include?('Write:')
      raise "Compose was not opened"
    end

    interactor.input_text(to) if to
    interactor.hit_key('Tab')

    interactor.hit_key('Tab')

    interactor.input_text(subject) if subject
    interactor.hit_key('Tab')
    interactor.input_text(body) if body

    yield

    close_composer
  end

  def close_composer
    # Close window without saving draft
    interactor.hit_key('Ctrl+w')
    unless in_main_window?
      # Compose window is asking to save the message.
      interactor.hit_key('Alt+n')
    end

    if interactor.current_window_title.include? "Save Message"
      # Window did not close, lets try the "Discard" shortcut
      interactor.hit_key('Alt+d')
    end

    sleep 2 unless in_main_window?
  end

  def change_spellchecker_language(language_name)
    interactor.hit_key('Ctrl+Shift+P')
    interactor.hit_key('Alt+l')

    # Unchecking other dictionaries
    (INSTALLED_DICTIONARIES - [language_name]).each do |language|
      interactor.click_on_text(language, filter: current_window_words_filter)
    end

    interactor.click_on_text(language_name, filter: current_window_words_filter)

    interactor.hit_key('Alt+c')
  end

  def current_window_words_filter
    current_window_geometry = interactor.current_window_geometry
    proc do |words|
      current_window_geometry.include?(*words.first.center)
    end
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
    on_composer(to: 'en@en.en', subject: 'Some subject', body: 'Hi') do
      # Open a window without closing the other
      on_composer(to: 'es@es.es', subject:'Un asunto') do
        change_spellchecker_language('Spanish')
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
      change_spellchecker_language('Spanish')
      wait_for_label('Discarded to save language preferences as there are too many recipients')
    end

    on_composer(to: 'alice <test@test.com>', subject: 'Un asunto') do
      change_spellchecker_language('Spanish')
      wait_for_label('Saved es-ES as default')
    end

    # Reply
    # The email to reply has "This is a test email" as subject but
    # "test" and "email" words are not always correctly read by the reader.
    interactor.click_on_text('This') rescue interactor.hit_key('space')
    interactor.hit_key('Control+r')
    sleep 2
    wait_for_label('Remembered es-ES')
  end

  it 'preferences window' do
    interactor.hit_key('Alt+t p a', delay: 0.15)
    sleep 2

    interactor.click_on_text('Extensions', filter: left_side_menu_filter)
    sleep 1

    interactor.click_on_text('Automatic Dictionary')
    # Go to preferences tab
    interactor.click_on_text('Details')
    interactor.click_on_text('Preferences')
    sleep 5
    interactor.wait_for_text('Notification level:')
    expect(interactor.screen_text.scan('1200').count).to eql(2)
  end

  def left_side_menu_filter
    proc { |words| words.first.x_start < 200 }
  end
end
