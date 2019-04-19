require 'interactor/shared'
require 'tempfile'
require 'rtesseract'
require 'benchmark'
require 'logger'

module Interactor
  class Reader
    include Shared

    attr_accessor :screenshot, :resize_ratio

    def initialize(options = {})
      self.resize_ratio = options[:resize_ratio] || 4
    end

    def text_position(text)
      log_performance('text_position') do
        position_of(text, readed_words)
      end
    end

    def words
      log_performance('words') do
        readed_words.map(&:word)
      end
    end

    private

    def log_performance(title)
      out = nil
      delta = Benchmark.realtime do
        out = yield
      end
      logger.debug("Performance of #{title}: #{delta}")
      out
    end

    class Word
      attr_accessor :word, :x_start, :y_start, :x_end, :y_end

      def initialize(params)
        params.each {|k,v| public_send("#{k}=", v) }
      end

      def +(other)
        self.class.new(word: "#{word} #{other.word}",
                       x_start: [x_start, other.x_start].min,
                       y_start: [y_start, other.y_start].min,
                       x_end: [x_end, other.x_end].max,
                       y_end: [y_end, other.y_end].max
                      )
      end

      def center
        [
          (x_start + x_end) / 2,
          (y_start + y_end) / 2
        ]
      end
    end

    def screenshot
      @screenshot ||= Interactor::Snapshooter.create_screenshot
    end

    def readed_words
      file = screenshot
      file = prepare_image_to_read(file)
      words = RTesseract::Box.new(file, lang: 'eng', processor: "none").words
      words.map!{|word| Word.new(word) }
      logger.debug("Words: #{words}")
      words
    end

    def prepare_image_to_read(file)
      tmp="#{Tempfile.new('for-tesseract').path}.jpg"
      run("convert #{file} -quality 99% -colorspace Gray "\
          " -resize #{resize_ratio * 100}%"\
          " #{tmp}")
      tmp
    end

    def position_of(text, readed_words)
      # It returns a list of separated words. We need to find them in order
      # and merge the data to create a bounding box.
      target_words = text.split(/\s/)
      found_words = find_words(target_words, readed_words)
      return unless found_words.first
      logger.debug("Words found: #{found_words.first.inspect}")
      fix_ratio(found_words.first.reduce(:+).center)
    end

    # Returns the list of Word objects that contain the list of target words.
    def find_words(target_words, readed_words)
      # The strategy is: look for the first word, then check if the following
      # words match the list of target words.
      needle = target_words.first
      readed_words.each_with_index.map do |word, index|
        if word.word == needle
          # We did find the first word, lets see if following words
          # match the target.
          word_chain(target_words, readed_words, index)
        end
      end.compact
    end

    # Returns an array of words that contain the target words
    # or nil if it does not match the full list of target words.
    def word_chain(target_words, readed_words, index)
      target_words.each_with_index.inject([]) do |acc, (word, target_index)|
        if target_index == target_words.size - 1
          # Last word, we only need to match the first part
          return unless readed_words[index].word.start_with? word
        else
          return if readed_words[index].word != word
        end
        index+=1
        acc << readed_words[index-1]
      end
    end

    def fix_ratio(position)
      position.map { |point| point / resize_ratio }
    end
  end
end
