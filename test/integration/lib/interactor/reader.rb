require 'interactor/shared'
require 'tempfile'
require 'rtesseract'

module Interactor
  module Reader
    class << self
      include Shared
      RESIZE_RATIO = 4

      def text_position(text, attempt = 0)
        position_of(text, readed_words(attempt))
      end

      def words(attempt = 0)
        readed_words(attempt).map(&:word)
      end

      private

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

      def readed_words(attempt = 0)
        file = Interactor::Snapshooter.create_screenshot
        file = prepare_image_to_read(file, attempt)
        words = RTesseract::Box.new(file, lang: 'eng').words
        words.map!{|word| Word.new(word) }
      end

      def prepare_image_to_read(file, attempt = 0)
        negate = '-negate' if attempt % 2 == 1
        high_contrast = '-level %50' if attempt > 1
        tmp="#{Tempfile.new('for-tesseract').path}.jpg"
        run("convert #{file} -quality 99% -colorspace Gray "\
            "-resize #{RESIZE_RATIO * 100}% #{negate} #{high_contrast}"\
            " #{tmp}")
        tmp
      end

      def position_of(text, readed_words)
        # It returns a list of separated words. We need to find them in order
        # and merge the data to create a bounding box.
        target_words = text.split(/\s/)
        found_words = find_words(target_words, readed_words)
        return unless found_words.first
        puts found_words.first.inspect
        fix_ratio(found_words.first.reduce(:+).center)
      end

      def find_words(target_words, readed_words)
        needle = target_words.first
        readed_words.each_with_index.map do |word, index|
          if word.word == needle
            word_chain(target_words, readed_words, index)
          end
        end.compact
      end

      def word_chain(target_words, readed_words, index)
        target_words.inject([]) do |acc, word|
          return if readed_words[index].word != word
          index+=1
          acc << readed_words[index-1]
        end
      end

      def fix_ratio(position)
        position.map { |point| point / RESIZE_RATIO }
      end
    end
  end
end
