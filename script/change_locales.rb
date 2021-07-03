require 'json'

keys_to_remove = ['mailToDev', 'saveLogFile']

Dir.glob('addon/_locales/**/*.json').each do |locale|
  puts locale
  data = JSON.parse(File.open(locale).read)
  data.keys.each do |key|
    if keys_to_remove.any? { |needle| key.include? needle } || key.match(/Promotions/)
      puts "removing #{key}"
      data.delete(key)
    end
  end
  File.open(locale, 'w') {|f| f.write(JSON.pretty_generate(data)) }
end
