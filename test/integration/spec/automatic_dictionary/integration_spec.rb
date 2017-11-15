require 'interactor'
require 'json'
require 'image_uploader'

describe "AutomaticDictionary integration tests" do
  # Counting on:
  # - the DISPLAY env var is a valid X server
  # - The application language is english.

  # Target:
  # - Test that it gets installed correctly.
  # - We can compose.
  # - It remembers languages.
  # - Preferences window shows correctly.

  let(:profile_path) { Dir.mktmpdir }

  def run(command)
    puts command if ENV['DEBUG']
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
    run("cd #{root} ; ./build.sh")
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
  end

  after do
    run("pkill thunderbird")
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
    ImageUploader.new.upload(filepath) rescue nil # Not upload when offline
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

      # Test when recipients are too much
      recipients = 11.times.map { |i| "fr#{i}@fr.fr" }.join(',')
      on_composer(to: recipients) do
        change_spellchecker_language('eng')
        wait_for_label('Discarded to save language preferences as there are too much recipients.')
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
      attempts = 3
      begin
        interactor.click_on_text('Preferences')
        sleep 1
        interactor.wait_for_text('Allow to collect statistical data:')
      rescue => e
        # Some times clicking on preferences button does not work so we have to
        # click twice. Don't know why a button would not react to a click.
        # TODO: investigate why this happens.
        puts "Retrying from error #{e}"
        retry if (attempts -= 1) > 0
      end
    rescue => e
      log_and_fail(e)
    end
  end
end
