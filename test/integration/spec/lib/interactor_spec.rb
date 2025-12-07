require 'interactor'

describe Interactor do
  let(:instance) { Interactor.client }

  context '#create_screenshot' do
    let(:screenshot_file) { '/tmp/screenshot.png' }

    before do
      allow(Interactor::Snapshooter).to receive(:create_screenshot)
        .and_return(screenshot_file)
    end

    it 'creates a snapshot' do
      allow(File).to receive(:exist?).and_call_original
      allow(File).to receive(:exist?).with(screenshot_file).and_return(true)

      file = instance.create_screenshot
      expect(file).to eq(screenshot_file)
      expect(File.exist?(file)).to be_truthy
    end
  end

  context '#text_position' do
    let(:text) { 'This is a text' }

    let(:file) { 'spec/fixtures/fixture-this-is-a-text.png' }

    before do
      expect(Interactor::Snapshooter).to receive(:create_screenshot)
        .and_return(file)
    end

    it 'returns text position' do
      expect(instance.text_position(text)).to eql([271, 185])
    end

    context 'when text does not exist' do
      let(:text) { 'not there' }

      it 'returns nil' do
        expect(instance.text_position(text)).to be_nil
      end
    end

    context 'when word appears twice' do
      let(:file) { 'spec/fixtures/this-is-a-text-appears-twice.png' }

      it 'raises error' do
        expect { instance.text_position(text) }.to raise_error(Interactor::Reader::TextAppearsMoreThanOnceError)
      end

      context 'when we define a region of the screen' do
        let(:top_region) { proc { |sentence| sentence.first.y_start < 200 } }

        it 'returns half-top text appearance' do
          expect(instance.text_position(text, filter: top_region)).to eql([270, 57])
        end
      end

      context 'when its a tesseract glitch that reads the same word twice' do
        let(:text) { 'This' }
        let(:rtesseract_double) { double(:rtesseract, to_box: boxes) }
        let(:boxes) do
          [
            { word: 'This', x_start: 1, x_end: 100, y_start: 90, y_end: 120 },
            { word: 'This', x_start: 10, x_end: 110, y_start: 100, y_end: 150 }
          ]
        end
        before do
          expect(RTesseract).to receive(:new).and_return(rtesseract_double)
        end

        it 'detects that its overlapping and ignores it' do
          expect(instance.text_position(text)).to eql([25, 52])
        end

        context 'when there are more than 2 occurrences' do
          let(:extra_word) do
            { word: 'This', x_start: 100, x_end: 1100, y_start: 1000, y_end: 1500 }
          end
          before { boxes.push(extra_word) }

          it 'raises error' do
            expect { instance.text_position(text) }.to raise_error(Interactor::Reader::TextAppearsMoreThanOnceError)
          end
        end
      end
    end
  end

  context '#click_on_text' do
    let(:position) { [100, 200] }
    let(:text) { 'foo' }

    context 'when text is found' do
      before do
        allow(Interactor::KeyboardHitter).to receive(:current_window_title)
          .and_return('Inbox - test@test.com')
        allow(Interactor::Snapshooter).to receive(:create_screenshot)
          .and_return('spec/fixtures/fixture-this-is-a-text.png')
        allow_any_instance_of(Interactor::Reader).to receive(:text_position)
          .and_return(position)
        allow(Interactor::Clicker).to receive(:click_on).and_return(true)
      end

      it 'clicks on position' do
        expect(Interactor::Clicker).to receive(:click_on).with(position)
        expect(instance.click_on_text(text)).to be_truthy
      end
    end

    context 'when text is not found' do
      before do
        allow(instance).to receive(:wait_for_text)
          .and_raise(Interactor::Client::TextNotFound.new('Text not found'))
      end

      it 'raises TextNotFound error' do
        expect { instance.click_on_text(text) }.to raise_error(Interactor::Client::TextNotFound)
      end

      context 'with optional: true' do
        it 'does not raise error' do
          expect { instance.click_on_text(text, optional: true) }.not_to raise_error
        end

        it 'logs that optional text was not found' do
          expect(Interactor.logger).to receive(:info)
            .with("click_on_text(#{text.inspect})")
          expect(Interactor.logger).to receive(:info)
            .with("Could not find optional #{text}. Going on...")

          instance.click_on_text(text, optional: true)
        end
      end
    end

    context 'when error is not TextNotFound' do
      before do
        allow(instance).to receive(:wait_for_text)
          .and_raise(StandardError.new('Some other error'))
      end

      it 'propagates the error with optional: false' do
        expect { instance.click_on_text(text) }.to raise_error(StandardError, 'Some other error')
      end

      it 'propagates the error even with optional: true' do
        expect { instance.click_on_text(text, optional: true) }.to raise_error(StandardError, 'Some other error')
      end
    end
  end

  context '#hit_key' do
    let(:key) { 'Shift' }

    before do
      allow(Interactor::KeyboardHitter).to receive(:hit_key).and_return(true)
    end

    it 'hits the key' do
      expect(Interactor::KeyboardHitter).to receive(:hit_key).with(key)
      expect(instance.hit_key(key)).to be_truthy
    end
  end

  context '#wait_for_text' do
    let(:text) { 'Subject' }
    let(:position) { [100, 200] }
    let(:file) { 'spec/fixtures/fixture-this-is-a-text.png' }

    before do
      allow(Interactor::KeyboardHitter).to receive(:current_window_title)
        .and_return(window_title)
      allow(Interactor::Snapshooter).to receive(:create_screenshot)
        .and_return(file)
      allow_any_instance_of(Interactor::Reader).to receive(:text_position)
        .and_return(position)
    end

    context 'when window title contains expected pattern' do
      let(:window_title) { 'Inbox - test@test.com - Mozilla Thunderbird' }

      it 'does not attempt to close promotional tab' do
        expect(instance).not_to receive(:click_on_text).with('Inbox', optional: true)

        result = instance.wait_for_text(text)

        expect(result).to eq(position)
      end
    end

    context 'when window title contains Write:' do
      let(:window_title) { 'Write: New Message - Mozilla Thunderbird' }

      it 'does not attempt to close promotional tab' do
        expect(instance).not_to receive(:click_on_text).with('Inbox', optional: true)

        result = instance.wait_for_text(text)

        expect(result).to eq(position)
      end
    end

    context 'when window title indicates promotional tab' do
      let(:window_title) { 'Help Keep Thunderbird Alive - Mozilla Thunderbird' }

      before do
        # Mock the click_on_text call that happens during promotional tab detection
        allow(instance).to receive(:click_on_text).with('Inbox', optional: true, skip_promotional_check: true)
      end

      it 'attempts to close promotional tab by clicking Inbox' do
        expect(instance).to receive(:click_on_text).with('Inbox', optional: true, skip_promotional_check: true)

        instance.wait_for_text(text)
      end

      it 'logs the unexpected window title' do
        expect(Interactor.logger).to receive(:info)
          .with("wait_for_text Subject").ordered
        expect(Interactor.logger).to receive(:info)
          .with("Unexpected window title detected: '#{window_title}', switching to Inbox").ordered
        allow(Interactor.logger).to receive(:info) # Allow other log calls

        instance.wait_for_text(text)
      end
    end

    context 'when skip_promotional_check option is used' do
      let(:window_title) { 'Promotional Tab - Mozilla Thunderbird' }

      it 'skips promotional tab check to avoid infinite loop' do
        # Should NOT call check_and_close_promotional_tab or click_on_text
        expect(instance).not_to receive(:click_on_text)
        expect(Interactor::KeyboardHitter).not_to receive(:current_window_title)

        instance.wait_for_text(text, skip_promotional_check: true)
      end
    end

    context 'when checking for promotional tab and clicking Inbox' do
      let(:window_title) { 'Help Keep Thunderbird Alive - Mozilla Thunderbird' }

      it 'passes skip_promotional_check flag to avoid recursion' do
        # Should call click_on_text with skip_promotional_check: true
        expect(instance).to receive(:click_on_text)
          .with('Inbox', optional: true, skip_promotional_check: true)

        instance.wait_for_text(text)
      end
    end
  end
end
