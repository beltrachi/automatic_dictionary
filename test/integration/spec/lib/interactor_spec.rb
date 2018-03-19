require 'interactor'

describe Interactor do
  let(:instance) { Interactor.client }

  context '#create_screenshot' do
    let(:file) { instance.create_screenshot }

    it "creates a snapshot" do
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
      expect(instance.text_position(text)).to eql([271,185])
    end

    context 'when text does not exist' do
      let(:text) { 'not there' }

      it 'returns nil' do
        expect(instance.text_position(text)).to be_nil
      end
    end
  end

  context '#click_on_text' do
    let(:position) { [100,200] }
    let(:text) { 'foo' }
    before do
      expect_any_instance_of(Interactor::Reader).to receive(:text_position)
        .with(text).and_return(position)
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