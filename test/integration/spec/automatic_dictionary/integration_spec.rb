require 'interactor'

describe "AutomaticDictionary integration tests" do
  # Counting on:
  # - Thunderbird has been started
  # - the DISPLAY is where the app is running
  # - It has the focus
  # - The addon as been installed directly on the profile.
  # - The application language is english.
  # . Thunderbird is started in offline mode.

  # Target:
  # - Test that it gets installed correctly
  # - We can compose.
  # - It remembers languages.
  # - Preferences window works correctly.

  it 'works :_D' do
    begin
      interactor = Interactor.client
      # Configure a fake test account
      sleep 5
      interactor.click_on_text('Skip this and use my existing email')
      sleep 2
      
      interactor.input_text('Test user')
      interactor.hit_key('Tab')
      interactor.input_text('testing@example.com')
      interactor.hit_key('Tab')
      interactor.input_text('testtest')
      interactor.hit_key('Return')
      sleep 1
      # Open advanced settings
      4.times { interactor.hit_key('Tab') }
      interactor.hit_key('Return')
      sleep 1
      # Exit advanced settings by clicking OK
      interactor.hit_key('Shift+Tab')
      interactor.hit_key('Return')
      sleep 1
      # Focus on the new account
      interactor.click_on_text('testing@example.com')

      sleep 1

      # Enalbe plugins
      interactor.hit_key('Alt+t a', clear_modifiers: false)
      sleep 2

      # Enable extension
      interactor.click_on_text('Extensions')
      sleep 1
      interactor.click_on_text('Enable')

      # Enable spanish
      interactor.click_on_text('Dictionaries')
      interactor.click_on_text('Enable')

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
#      interactor.input_text('Ese cuerpo')
      sleep 1
      interactor.hit_key('Ctrl+Shift+P')
      interactor.hit_key('Alt+l')
      interactor.hit_key('s p a')
      sleep 1
      interactor.hit_key('Return')
      interactor.hit_key('Alt+c')

      interactor.text_position!('Saved es-ES as default')
    end
  end
end
