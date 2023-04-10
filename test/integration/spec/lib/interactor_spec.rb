require 'interactor'

describe Interactor do
  let(:instance) { Interactor.client }

  context '#create_screenshot' do
    let(:file) { instance.create_screenshot }

    it 'creates a snapshot' do
      expect(File.exist?(file))
    end

    after { File.delete(file) }
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
        expect { instance.text_position(text) }.to raise_error(/appears twice/)
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
            expect { instance.text_position(text) }.to raise_error(/appears twice/)
          end
        end
      end
    end
  end

  context '#click_on_text' do
    let(:position) { [100, 200] }
    let(:text) { 'foo' }
    before do
      expect_any_instance_of(Interactor::Reader).to receive(:text_position)
        .with(text, { filter: nil }).and_return(position)
    end

    # TODO: find a way to test that it actually works. Now it only calls
    # the xdotool binary. Maybe with some simple X app that has buttons?
    it 'clicks on position' do
      expect(instance.click_on_text(text)).to be_truthy
    end
  end

  context '#hit_key' do
    let(:key) { 'Shift' }

    # TODO: find a way to test this. We are ony testing that it does not break.
    it 'clicks escape' do
      expect(instance.hit_key(key)).to be_truthy
    end
  end
end
