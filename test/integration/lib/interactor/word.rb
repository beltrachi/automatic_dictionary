module Interactor
  class Word
    attr_accessor :word, :x_start, :y_start, :x_end, :y_end

    def initialize(params)
      self.word = params[:word]
      self.x_start = params[:x_start]
      self.x_end = params[:x_end]
      self.y_start = params[:y_start]
      self.y_end = params[:y_end]
    end

    def +(other)
      params = {
        word: "#{word} #{other.word}"
      }.merge(union_area(other))

      self.class.new(params)
    end

    def center
      [
        (x_start + x_end) / 2,
        (y_start + y_end) / 2
      ]
    end

    private

    def union_area(other)
      {
        x_start: [x_start, other.x_start].min,
        y_start: [y_start, other.y_start].min,
        x_end: [x_end, other.x_end].max,
        y_end: [y_end, other.y_end].max
      }
    end
  end
end
