require 'interactor'

describe Interactor do
  let(:klass) { Class.new }
  before { klass.include ::Interactor }
  let(:instance) { klass.new }

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
  end
end