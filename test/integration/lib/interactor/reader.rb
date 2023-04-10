require 'interactor/shared'
require 'tempfile'
require 'rtesseract'
require 'benchmark'
require 'logger'
require 'rubygems/text'
require 'interactor/word'

module Interactor
  class Reader
    include Shared
    include Gem::Text

    attr_accessor :resize_ratio

    def initialize(options = {})
      self.resize_ratio = options[:resize_ratio] || 2
    end

    # Captures screen and memoizes it.
    # You can capture screen (its fast), and then read it later.
    def capture_screen
      create_screenshot
    end

    def text_position(text, options = {})
      log_performance('text_position') do
        position_of(text, readed_words, options)
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

    def create_screenshot
      @screenshot ||= Interactor::Snapshooter.create_screenshot
    end

    def readed_words
      file = create_screenshot
      file = prepare_image_to_read(file)
      words = RTesseract.new(file, lang: 'eng').to_box
      words.map! { |word| Word.new(fix_word_ratio(word)) }
      logger.debug("Words: #{words.map(&:word)}")
      words
    end

    def prepare_image_to_read(file)
      tmp = "#{Tempfile.new('for-tesseract').path}.jpg"
      run("convert #{file} -quality 99% -colorspace Gray "\
          " -resize #{resize_ratio * 100}%"\
          " #{tmp}")
      tmp
    end

    def position_of(text, readed_words, options = {})
      # It returns a list of separated words. We need to find them in order
      # and merge the data to create a bounding box.
      target_words = text.split(/\s/)
      found_words = find_words(target_words, readed_words)

      found_words = apply_filter(found_words, options)

      return unless found_words.first

      logger.debug("Words found: #{found_words.first.inspect}")
      error_if_word_appears_twice!(found_words)

      found_words.first.reduce(:+).center
    end

    def apply_filter(found_words, options)
      return found_words unless options[:filter]

      found_words.select { |group| options[:filter].call(group) }
    end

    # Returns the list of Word objects that contain the list of target words.
    def find_words(target_words, readed_words)
      # The strategy is: look for the first word, then check if the following
      # words match the list of target words.
      needle = target_words.first
      readed_words.each_with_index.map do |word, index|
        next unless equal_words?(word.word, needle)

        # We did find the first word, lets see if following words
        # match the target.
        word_chain(target_words, readed_words, index)
      end.compact
    end

    # Returns an array of words that contain the target words
    # or nil if it does not match the full list of target words.
    def word_chain(target_words, readed_words, index)
      target_words.each_with_index.inject([]) do |acc, (word, target_index)|
        if target_index == target_words.size - 1
          # Last word, we only need to match the first part
          part = readed_words[index].word.split(/\s/).first
          return unless equal_words?(part, word)
        elsif !equal_words?(readed_words[index].word, word)
          return
        end
        index += 1
        acc << readed_words[index - 1]
      end
    end

    def fix_word_ratio(word_params)
      word_params.map do |key, value|
        next [key, value] unless dimension_key? key

        [key, value / resize_ratio]
      end.to_h
    end

    def dimension_key?(key)
      key.to_s.start_with?('x_') || key.to_s.start_with?('y_')
    end

    def equal_words?(word, other_word)
      return true if word == other_word

      size_ratio = word.size / other_word.size.to_f
      return false unless size_ratio.between?(0.9, 1.1)

      distance = levenshtein_distance(word, other_word)
      # True when changes needed are only 20% the other_word we are looking for.
      (distance / other_word.size.to_f) < 0.20
    end

    def error_if_word_appears_twice!(words)
      return if words.size < 2

      unified_sentences = words.map { |words_list| words_list.reduce(:+) }
      groups = group_overlapping_sentences(unified_sentences)

      return if groups.size < 2

      word_appears_twice_error!(unified_sentences.first.word)
    end

    def word_appears_twice_error!(text)
      raise "Text '#{text}' appears twice, please choose a better identifier or "\
            'filter by screen region'
    end

    def group_overlapping_sentences(sentences)
      sentences.each_with_object([]) do |sentence, groups|
        overlapping_group_index = groups.find_index { |group| group.overlaps? sentence }

        if overlapping_group_index
          groups[overlapping_group_index] += sentence
        else
          groups << sentence
        end
      end
    end
  end
end
