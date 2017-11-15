require 'interactor/client'

module Interactor
  def self.client(opts = {})
    Interactor::Client.new(opts)
  end

  def self.root
    File.expand_path(File.join(File.dirname(__FILE__), '..', '..'))
  end

  def self.debug?
    ENV['DEBUG'] == "1"
  end
end