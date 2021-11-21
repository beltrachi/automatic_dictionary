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

  # @return boolean false when command fails
  def run(command)
    logger.debug(command)
    system(command) || raise("Command failed: #{command}")
  end

  let(:profile_base) do
    'test/integration/fixtures/test-profile.tar.gz'
  end

  def prepare_profile(path)
    source = File.join(root, profile_base)
    run("tar -xvf #{source} -C #{path}")
  end

  def install_extension(extension_file, profile_path)
    cmd = File.join(root, 'script/install_extension.sh')
    extension = File.join(root, extension_file)
    install = "#{cmd} --path #{profile_path} --extension #{extension}"
    run(install)
  end

  def in_main_window?
    title = interactor.current_window_title
    title.start_with?('Inbox') || title.start_with?('Home')
  end

  def wait_for_main_window
    5.times do
      return if in_main_window?

      sleep 1
      yield
    end
    raise 'Main window not found'
  end

  def window_title_include?(text)
    interactor.current_window_title.include?(text)
  end

  def wait_for_window(title_part)
    10.times do
      return if window_title_include?(title_part)

      sleep 1
    end
    raise "Window including #{title_part} not found"
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
  let(:log_file) { "#{profile_path}/automatic_dictionary.log" }
  let(:thunderbird_version) do
    version = `thunderbird --version`.chomp
    logger.info("Thunderbird version: #{version}")
    Gem::Version.new(version.match(/\d+\.\d+/)[0])
  end

  # Some mouse interactions need two clicks (who knows why!?)
  # To make it more manageable we pass the block to this method
  def rescue_and_retry(max_attempts)
    attempts ||= 1
    yield
  rescue StandardError
    if attempts < max_attempts
      attempts += 1
      logger.warn("Retrying block once: #{caller[1]}")
      retry
    end
    raise
  end

  before do
    # Update build to lastest
    run("cd #{root} ; ./build.sh")

    prepare_profile(profile_path)
    install_extension('automatic_dictionary.xpi', profile_path)

    run("touch #{log_file}")
    run("tail -f #{log_file} &")
    run("thunderbird --profile #{profile_path} --no-remote &")

    sleep 5

    interactor.hit_key('Escape')
    interactor.hit_key('Escape')

    begin
      if thunderbird_version >= Gem::Version.new('76')
        interactor.click_on_text('Could not connect to', optional: true)
        # To enable the extension we need to click on the hamburguer menu.
        # As the hamburguer menu has no keyboard shortcut nor readable label,
        # we have to guess its position based on something we can read, the
        # Events label.

        # We need to retry on clicking on hamburguer because some times the
        # menu does not open. Based on circleci logs, a simple operation like
        # click can last up to 15s. Maybe it does not have the same CPU available
        # all the time.
        rescue_and_retry(3) do
          events_position = interactor.wait_for_text('Events')
          # Click 50 pixels on the left of Events label.
          interactor.click_on_position([events_position.first - 50, events_position.last])
          interactor.click_on_text('Automatic Dictionary added')
        end
        interactor.wait_for_text('Enable')
        interactor.hit_key('Alt+e')
      else
        # Popup asking to enable our plugin.
        sleep 1

        begin
          interactor.wait_for_text('Enable')
          interactor.hit_key('Alt+e')
        rescue
          logger.warn("Enable extension popup not found")
        end
      end
    end
    sleep 1
    interactor.hit_key('Escape')
    sleep 1
    interactor.hit_key('Escape')

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
    run("pkill -f thunderbird")
    run("pkill tail")
  end

  def on_composer(to: nil, subject: nil, body: nil)
    interactor.hit_key('Control+n')
    sleep 2
    unless window_title_include?('Write:')
      raise "Compose was not opened"
    end

    interactor.input_text(to) if to
    interactor.hit_key('Tab')

    # On tb>73 we need two tabs to jump to subject because
    # first tab only confirms email.
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
    on_composer(to: 'en@en.en', subject: 'Some subject', body: 'Hi') do
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
      wait_for_label('Discarded to save language preferences as there are too much recipients')
    end

    # Reply

    on_composer(to: 'alice <test@test.com>', subject: 'Un asunto') do
      change_spellchecker_language('spa')
      wait_for_label('Saved es-ES as default')
    end

    interactor.click_on_text('This is a test email')
    interactor.hit_key('Control+r')
    wait_for_label('Remembered es-ES')
  end

  it 'preferences window' do
    interactor.hit_key('Alt+t p a', delay: 0.15)
    sleep 2
    if thunderbird_version >= Gem::Version.new('76')
      # 76 does not show extensions right away, we need to click on "Extensions" left tabs.
      interactor.click_on_text('Extensions')
      sleep 1
    end
    interactor.click_on_text('Automatic Dictionary')
    # We want to click on preferences but as there is another word "preferences" on the
    # screen, we need to specify some context too. Luckly the center of "Details | Preferences"
    # falls in the preferences button because the word is bigger.
    interactor.click_on_text('Details Preferences')
    sleep 5
    interactor.wait_for_text('Notification level:')
    interactor.wait_for_text('1200')
  end
end
