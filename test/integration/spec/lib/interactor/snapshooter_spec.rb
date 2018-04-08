require_relative '../../spec_helper'

require 'interactor'

describe Interactor::Snapshooter do
  let(:instance) { described_class }

  context '#create_screenshot' do
    it 'captures with import' do
      expect(instance).to receive(:run) do |command|
        expect(command).to start_with('import -window root')
        expect(command).to include('jpg')
      end
      instance.create_screenshot
    end
  end
end
