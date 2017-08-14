require 'interactor/client'

module Interactor
  def self.client(opts = {})
    Interactor::Client.new(opts)
  end
end